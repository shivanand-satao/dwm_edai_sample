const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const router = express.Router();

// Get team members (Manager only)
router.get('/members', authenticateToken, requireManager, async (req, res) => {
  try {
    const [members] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at as join_date,
        u.is_active,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT dwl.id) as work_entries,
        COALESCE(SUM(dwl.hours_worked), 0) as total_hours
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      LEFT JOIN daily_work_logs dwl ON u.id = dwl.user_id
      WHERE u.team_id = ? AND u.role = ?
      GROUP BY u.id, u.name, u.email, u.created_at, u.is_active
      ORDER BY u.name ASC
    `, [req.user.team_id, 'employee']);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members'
    });
  }
});

// Get team statistics (Manager only)
router.get('/stats', authenticateToken, requireManager, async (req, res) => {
  try {
    // Get basic team stats
    const [teamStats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT u.id) as total_members,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
        COUNT(DISTINCT dwl.id) as total_work_entries,
        COALESCE(SUM(dwl.hours_worked), 0) as total_hours_logged
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      LEFT JOIN daily_work_logs dwl ON u.id = dwl.user_id
      WHERE u.team_id = ? AND u.role = ?
    `, [req.user.team_id, 'employee']);

    // Get recent activity
    const [recentActivity] = await pool.execute(`
      (SELECT 
        'task' as type,
        t.title as description,
        u.name as user_name,
        t.created_at as activity_date
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_by = ?
      ORDER BY t.created_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'work_log' as type,
        CONCAT('Logged work: ', dwl.project_name) as description,
        u.name as user_name,
        dwl.created_at as activity_date
      FROM daily_work_logs dwl
      JOIN users u ON dwl.user_id = u.id
      WHERE u.team_id = ? AND u.role = ?
      ORDER BY dwl.created_at DESC
      LIMIT 5)
      
      ORDER BY activity_date DESC
      LIMIT 10
    `, [req.user.id, req.user.team_id, 'employee']);

    res.json({
      success: true,
      data: {
        stats: teamStats[0],
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team statistics'
    });
  }
});

// Get team performance data (Manager only)
router.get('/performance', authenticateToken, requireManager, async (req, res) => {
  try {
    const [performance] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
        COALESCE(AVG(dwl.hours_worked), 0) as avg_daily_hours,
        COUNT(DISTINCT dwl.work_date) as active_days,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) * 100.0) / 
            NULLIF(COUNT(DISTINCT t.id), 0), 
            2
          ), 
          0
        ) as completion_rate
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      LEFT JOIN daily_work_logs dwl ON u.id = dwl.user_id
      WHERE u.team_id = ? AND u.role = ?
      GROUP BY u.id, u.name, u.email
      ORDER BY completion_rate DESC, completed_tasks DESC
    `, [req.user.team_id, 'employee']);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team performance data'
    });
  }
});

// Update team member status (Manager only)
router.patch('/members/:memberId/status', authenticateToken, requireManager, async (req, res) => {
  const { memberId } = req.params;
  const { is_active } = req.body;

  try {
    // Verify member belongs to the manager's team
    const [members] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND team_id = ? AND role = ?',
      [memberId, req.user.team_id, 'employee']
    );

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Update member status
    await pool.execute(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active, memberId]
    );

    res.json({
      success: true,
      message: `Team member ${is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Update member status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member status'
    });
  }
});

// Get team info (for both manager and employee)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const [teamInfo] = await pool.execute(`
      SELECT 
        t.id,
        t.team_name,
        t.manager_code,
        t.created_at,
        u.name as manager_name,
        u.email as manager_email,
        COUNT(DISTINCT members.id) as member_count
      FROM teams t
      JOIN users u ON t.manager_id = u.id
      LEFT JOIN users members ON t.id = members.team_id AND members.role = 'employee' AND members.is_active = true
      WHERE t.id = ?
      GROUP BY t.id, t.team_name, t.manager_code, t.created_at, u.name, u.email
    `, [req.user.team_id]);

    if (teamInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: teamInfo[0]
    });
  } catch (error) {
    console.error('Get team info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team information'
    });
  }
});

module.exports = router;