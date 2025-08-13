const express = require('express');
const { pool } = require('../config/database');
const {
  authenticateToken,
  requireManager,
  requireEmployee,
} = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const router = express.Router();

// Get all tasks for a manager
router.get('/manager', authenticateToken, requireManager, async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      `
      SELECT DISTINCT
        t.*,
        ts.submission_text,
        ts.file_path,
        ts.submitted_at,
        ts.status as submission_status
      FROM tasks t
      LEFT JOIN task_submissions ts ON t.id = ts.task_id
      WHERE t.assigned_by = ?
      ORDER BY t.created_at DESC
    `,
      [req.user.id]
    );

    // Get assignees for each task
    for (let task of tasks) {
      const [assignees] = await pool.execute(
        `
        SELECT u.id, u.name, u.email
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
      `,
        [task.id]
      );

      task.assignees = assignees;
      // For backward compatibility, set assigned_to_name from assignees
      task.assigned_to_name =
        assignees.length > 0
          ? assignees.map((a) => a.name).join(', ')
          : 'Unassigned';
    }

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Get manager tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
    });
  }
});

// Get tasks assigned to an employee
router.get(
  '/employee',
  authenticateToken,
  requireEmployee,
  async (req, res) => {
    try {
      const [tasks] = await pool.execute(
        `
      SELECT DISTINCT
        t.*,
        u.name as assigned_by_name,
        ts.submission_text,
        ts.file_path,
        ts.submitted_at,
        ts.status as submission_status,
        ts.manager_feedback
      FROM tasks t
      LEFT JOIN users u ON t.assigned_by = u.id
      LEFT JOIN task_submissions ts ON t.id = ts.task_id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      WHERE ta.user_id = ? OR t.assigned_to = ?
      ORDER BY t.created_at DESC
    `,
        [req.user.id, req.user.id]
      );

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error('Get employee tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tasks',
      });
    }
  }
);

// Create new task (Manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  const { title, description, assigned_to, due_date, priority } = req.body;

  try {
    // Validate input
    if (!title || !assigned_to || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, assigned_to, and due_date are required',
      });
    }

    // Parse assigned_to - it can be a single ID or array of IDs
    const assigneeIds = Array.isArray(assigned_to)
      ? assigned_to
      : [assigned_to];

    // Verify all assigned users are in the same team
    const placeholders = assigneeIds.map(() => '?').join(',');
    const [teamMembers] = await pool.execute(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND team_id = ? AND role = ?`,
      [...assigneeIds, req.user.team_id, 'employee']
    );

    if (teamMembers.length !== assigneeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected team members are invalid',
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create task (keep first assignee in assigned_to for backward compatibility)
      const [result] = await connection.execute(
        `
        INSERT INTO tasks (title, description, assigned_by, assigned_to, due_date, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          title,
          description || '',
          req.user.id,
          assigneeIds[0],
          due_date,
          priority || 'medium',
          'pending',
        ]
      );

      const taskId = result.insertId;

      // Add all assignees to task_assignees table
      for (const assigneeId of assigneeIds) {
        await connection.execute(
          'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
          [taskId, assigneeId]
        );
      }

      await connection.commit();
      connection.release();

      // Get the created task with assignee details
      const [assignees] = await pool.execute(
        `
        SELECT u.id, u.name, u.email
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
      `,
        [taskId]
      );

      const [newTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [
        taskId,
      ]);
      newTask[0].assignees = assignees;
      newTask[0].assigned_to_name = assignees.map((a) => a.name).join(', ');

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: newTask[0],
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
    });
  }
});

// Update task status (Employee)
router.patch(
  '/:taskId/status',
  authenticateToken,
  requireEmployee,
  async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;

    try {
      // Verify task belongs to the employee
      const [tasks] = await pool.execute(
        'SELECT id FROM tasks WHERE id = ? AND assigned_to = ?',
        [taskId, req.user.id]
      );

      if (tasks.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      // Update task status
      await pool.execute(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, taskId]
      );

      res.json({
        success: true,
        message: 'Task status updated successfully',
      });
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task status',
      });
    }
  }
);

// Submit task work (Employee) - with file upload
router.post(
  '/:taskId/submit',
  authenticateToken,
  requireEmployee,
  upload.array('files', 5),
  handleUploadError,
  async (req, res) => {
    const { taskId } = req.params;
    const { submission_text } = req.body;
    const files = req.files || [];

    try {
      // Verify task is assigned to the employee
      const [taskAssignments] = await pool.execute(
        `
      SELECT t.id FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      WHERE t.id = ? AND (t.assigned_to = ? OR ta.user_id = ?)
    `,
        [taskId, req.user.id, req.user.id]
      );

      if (taskAssignments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or not assigned to you',
        });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check if submission already exists
        const [existingSubmissions] = await connection.execute(
          'SELECT id FROM task_submissions WHERE task_id = ? AND submitted_by = ?',
          [taskId, req.user.id]
        );

        let submissionId;

        if (existingSubmissions.length > 0) {
          // Update existing submission
          submissionId = existingSubmissions[0].id;
          await connection.execute(
            `
          UPDATE task_submissions 
          SET submission_text = ?, submitted_at = CURRENT_TIMESTAMP, status = ?
          WHERE id = ?
        `,
            [submission_text || '', 'submitted', submissionId]
          );
        } else {
          // Create new submission
          const [result] = await connection.execute(
            `
          INSERT INTO task_submissions (task_id, submitted_by, submission_text, status)
          VALUES (?, ?, ?, ?)
        `,
            [taskId, req.user.id, submission_text || '', 'submitted']
          );
          submissionId = result.insertId;
        }

        // Save file information if files were uploaded
        if (files.length > 0) {
          for (const file of files) {
            await connection.execute(
              `
            INSERT INTO work_attachments (daily_work_id, file_name, file_path, file_type, file_size)
            VALUES (?, ?, ?, ?, ?)
          `,
              [
                submissionId,
                file.originalname,
                file.path,
                file.mimetype,
                file.size,
              ]
            );
          }

          // Update submission with file info
          await connection.execute(
            `
          UPDATE task_submissions 
          SET file_path = ?, file_name = ?
          WHERE id = ?
        `,
            [files[0].path, files[0].originalname, submissionId]
          );
        }

        // Update task status to completed
        await connection.execute(
          'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['completed', taskId]
        );

        await connection.commit();
        connection.release();

        res.json({
          success: true,
          message: 'Task submitted successfully',
          data: {
            submissionId,
            filesUploaded: files.length,
          },
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Submit task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit task',
      });
    }
  }
);

// Get team members for task assignment (Manager only)
router.get(
  '/team-members',
  authenticateToken,
  requireManager,
  async (req, res) => {
    try {
      const [members] = await pool.execute(
        'SELECT id, name, email FROM users WHERE team_id = ? AND role = ? AND is_active = ?',
        [req.user.team_id, 'employee', true]
      );

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
      });
    }
  }
);

// Update task (Manager only)
router.put('/:taskId', authenticateToken, requireManager, async (req, res) => {
  const { taskId } = req.params;
  const { title, description, assigned_to, due_date, priority } = req.body;

  try {
    // Verify task belongs to the manager
    const [tasks] = await pool.execute(
      'SELECT id FROM tasks WHERE id = ? AND assigned_by = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Parse assigned_to - it can be a single ID or array of IDs
    const assigneeIds = Array.isArray(assigned_to) ? assigned_to : [assigned_to];

    // Verify all assigned users are in the same team
    const placeholders = assigneeIds.map(() => '?').join(',');
    const [teamMembers] = await pool.execute(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND team_id = ? AND role = ?`,
      [...assigneeIds, req.user.team_id, 'employee']
    );

    if (teamMembers.length !== assigneeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected team members are invalid'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update task
      await connection.execute(`
        UPDATE tasks 
        SET title = ?, description = ?, assigned_to = ?, due_date = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [title, description || '', assigneeIds[0], due_date, priority || 'medium', taskId]);

      // Remove old assignees
      await connection.execute('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);

      // Add new assignees
      for (const assigneeId of assigneeIds) {
        await connection.execute(
          'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
          [taskId, assigneeId]
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Task updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// Delete task (Manager only)
router.delete('/:taskId', authenticateToken, requireManager, async (req, res) => {
  const { taskId } = req.params;

  try {
    // Verify task belongs to the manager
    const [tasks] = await pool.execute(
      'SELECT id FROM tasks WHERE id = ? AND assigned_by = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete task assignees
      await connection.execute('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
      
      // Delete task submissions
      await connection.execute('DELETE FROM task_submissions WHERE task_id = ?', [taskId]);
      
      // Delete the task
      await connection.execute('DELETE FROM tasks WHERE id = ?', [taskId]);

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

module.exports = router;
