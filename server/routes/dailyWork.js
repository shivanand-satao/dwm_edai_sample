const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireManager, requireEmployee } = require('../middleware/auth');
const router = express.Router();

// Get daily work logs for an employee
router.get('/employee', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const [workLogs] = await pool.execute(`
      SELECT 
        dwl.*,
        wa.file_name,
        wa.file_path
      FROM daily_work_logs dwl
      LEFT JOIN work_attachments wa ON dwl.id = wa.daily_work_id
      WHERE dwl.user_id = ?
      ORDER BY dwl.work_date DESC
    `, [req.user.id]);

    // Group attachments by work log
    const groupedLogs = workLogs.reduce((acc, log) => {
      const existingLog = acc.find(l => l.id === log.id);
      if (existingLog) {
        if (log.file_name) {
          existingLog.attachments = existingLog.attachments || [];
          existingLog.attachments.push({
            file_name: log.file_name,
            file_path: log.file_path
          });
        }
      } else {
        const newLog = { ...log };
        delete newLog.file_name;
        delete newLog.file_path;
        if (log.file_name) {
          newLog.attachments = [{
            file_name: log.file_name,
            file_path: log.file_path
          }];
        }
        acc.push(newLog);
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: groupedLogs
    });
  } catch (error) {
    console.error('Get employee daily work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily work logs'
    });
  }
});

// Get team daily work logs for manager
router.get('/team', authenticateToken, requireManager, async (req, res) => {
  try {
    const [workLogs] = await pool.execute(`
      SELECT 
        dwl.*,
        u.name as employee_name,
        u.email as employee_email,
        wa.file_name,
        wa.file_path
      FROM daily_work_logs dwl
      LEFT JOIN users u ON dwl.user_id = u.id
      LEFT JOIN work_attachments wa ON dwl.id = wa.daily_work_id
      WHERE u.team_id = ? AND u.role = ?
      ORDER BY dwl.work_date DESC, u.name ASC
    `, [req.user.team_id, 'employee']);

    // Group attachments by work log
    const groupedLogs = workLogs.reduce((acc, log) => {
      const existingLog = acc.find(l => l.id === log.id);
      if (existingLog) {
        if (log.file_name) {
          existingLog.attachments = existingLog.attachments || [];
          existingLog.attachments.push({
            file_name: log.file_name,
            file_path: log.file_path
          });
        }
      } else {
        const newLog = { ...log };
        delete newLog.file_name;
        delete newLog.file_path;
        if (log.file_name) {
          newLog.attachments = [{
            file_name: log.file_name,
            file_path: log.file_path
          }];
        }
        acc.push(newLog);
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: groupedLogs
    });
  } catch (error) {
    console.error('Get team daily work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team daily work logs'
    });
  }
});

// Create daily work entry (Employee)
router.post('/', authenticateToken, requireEmployee, async (req, res) => {
  const { 
    work_date, 
    work_description, 
    hours_worked, 
    project_name, 
    work_category,
    mood_rating,
    challenges_faced,
    achievements 
  } = req.body;

  try {
    // Validate input
    if (!work_date || !work_description) {
      return res.status(400).json({
        success: false,
        message: 'Work date and description are required'
      });
    }

    // Check if entry already exists for this date
    const [existingEntries] = await pool.execute(
      'SELECT id FROM daily_work_logs WHERE user_id = ? AND work_date = ?',
      [req.user.id, work_date]
    );

    if (existingEntries.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Daily work entry already exists for this date'
      });
    }

    // Create daily work entry
    const [result] = await pool.execute(`
      INSERT INTO daily_work_logs (
        user_id, work_date, work_description, hours_worked, 
        project_name, work_category, mood_rating, challenges_faced, achievements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, 
      work_date, 
      work_description, 
      hours_worked || 0, 
      project_name || '', 
      work_category || '',
      mood_rating || 'neutral',
      challenges_faced || '',
      achievements || ''
    ]);

    // Get the created entry
    const [newEntry] = await pool.execute(
      'SELECT * FROM daily_work_logs WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Daily work entry created successfully',
      data: newEntry[0]
    });

  } catch (error) {
    console.error('Create daily work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create daily work entry'
    });
  }
});

// Update daily work entry (Employee)
router.put('/:entryId', authenticateToken, requireEmployee, async (req, res) => {
  const { entryId } = req.params;
  const { 
    work_description, 
    hours_worked, 
    project_name, 
    work_category,
    mood_rating,
    challenges_faced,
    achievements 
  } = req.body;

  try {
    // Verify entry belongs to the employee
    const [entries] = await pool.execute(
      'SELECT id FROM daily_work_logs WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily work entry not found'
      });
    }

    // Update entry
    await pool.execute(`
      UPDATE daily_work_logs 
      SET work_description = ?, hours_worked = ?, project_name = ?, 
          work_category = ?, mood_rating = ?, challenges_faced = ?, 
          achievements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      work_description, 
      hours_worked || 0, 
      project_name || '', 
      work_category || '',
      mood_rating || 'neutral',
      challenges_faced || '',
      achievements || '',
      entryId
    ]);

    res.json({
      success: true,
      message: 'Daily work entry updated successfully'
    });

  } catch (error) {
    console.error('Update daily work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daily work entry'
    });
  }
});

// Delete daily work entry (Employee)
router.delete('/:entryId', authenticateToken, requireEmployee, async (req, res) => {
  const { entryId } = req.params;

  try {
    // Verify entry belongs to the employee
    const [entries] = await pool.execute(
      'SELECT id FROM daily_work_logs WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily work entry not found'
      });
    }

    // Delete attachments first
    await pool.execute(
      'DELETE FROM work_attachments WHERE daily_work_id = ?',
      [entryId]
    );

    // Delete entry
    await pool.execute(
      'DELETE FROM daily_work_logs WHERE id = ?',
      [entryId]
    );

    res.json({
      success: true,
      message: 'Daily work entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete daily work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete daily work entry'
    });
  }
});

// Get work statistics for employee
router.get('/stats', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(hours_worked) as total_hours,
        AVG(hours_worked) as avg_hours_per_day,
        COUNT(DISTINCT project_name) as projects_worked
      FROM daily_work_logs 
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Get work stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work statistics'
    });
  }
});

module.exports = router;