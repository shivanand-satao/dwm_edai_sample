const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate unique manager code
const generateManagerCode = () => {
  return 'MGR-' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Register Manager
router.post('/register/manager', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique manager code
    let managerCode;
    let isUnique = false;
    
    while (!isUnique) {
      managerCode = generateManagerCode();
      const [existing] = await pool.execute(
        'SELECT id FROM teams WHERE manager_code = ?',
        [managerCode]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const [userResult] = await connection.execute(
        'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, 'manager', true]
      );

      const userId = userResult.insertId;

      // Create team
      const [teamResult] = await connection.execute(
        'INSERT INTO teams (team_name, manager_id, manager_code) VALUES (?, ?, ?)',
        [`${name}'s Team`, userId, managerCode]
      );

      const teamId = teamResult.insertId;

      // Update user with team_id
      await connection.execute(
        'UPDATE users SET team_id = ? WHERE id = ?',
        [teamId, userId]
      );

      await connection.commit();
      connection.release();

      // Generate token
      const token = generateToken(userId);

      res.status(201).json({
        success: true,
        message: 'Manager registered successfully',
        data: {
          user: {
            id: userId,
            name,
            email,
            role: 'manager',
            teamId,
            managerCode
          },
          token
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Manager registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register Employee
router.post('/register/employee', async (req, res) => {
  const { name, email, password, managerCode } = req.body;

  try {
    // Validate input
    if (!name || !email || !password || !managerCode) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and manager code are required'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Verify manager code and get team info
    const [teams] = await pool.execute(
      'SELECT id, team_name, manager_id FROM teams WHERE manager_code = ?',
      [managerCode]
    );

    if (teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid manager code'
      });
    }

    const team = teams[0];

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create employee
    const [userResult] = await pool.execute(
      'INSERT INTO users (name, email, password, role, manager_id, team_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'employee', managerCode, team.id, true]
    );

    const userId = userResult.insertId;

    // Generate token
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        user: {
          id: userId,
          name,
          email,
          role: 'employee',
          teamId: team.id,
          teamName: team.team_name,
          managerCode
        },
        token
      }
    });

  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required'
      });
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT u.*, t.team_name, t.manager_code FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.email = ? AND u.role = ? AND u.is_active = ?',
      [email, role, true]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;