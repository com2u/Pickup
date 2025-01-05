const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user from database
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
          logger.warn('Login attempt with invalid username', {
            timestamp: new Date().toISOString(),
            attemptedUsername: username
          });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          logger.warn('Login attempt with invalid password', {
            timestamp: new Date().toISOString(),
            username: user.username,
            userId: user.id
          });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        // Log successful login
        logger.info('User login successful', {
          timestamp: new Date().toISOString(),
          userId: user.id,
          username: user.username
        });

        // Return user info and token
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            created_at: user.created_at,
          },
        });
      }
    );
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', auth, (req, res) => {
  db.get(
    'SELECT id, username, created_at FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    }
  );
});

// Register new user (admin only)
router.post('/register', auth, (req, res) => {
  const { username, password } = req.body;

  // Check if requester is admin
  db.get(
    'SELECT username FROM users WHERE id = ?',
    [req.user.userId],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user || user.username !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        db.run(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword],
          function (err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
              }
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({
              id: this.lastID,
              username,
              created_at: new Date().toISOString(),
            });
          }
        );
      } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );
});

// Get all users (minimal data for all users, full data for admin)
router.get('/users', auth, (req, res) => {
  db.get(
    'SELECT username FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const isAdmin = user && user.username === 'admin';
      const query = isAdmin
        ? 'SELECT id, username, created_at FROM users'
        : 'SELECT id, username FROM users';

      db.all(query, [], (err, users) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        res.json(users);
      });
    }
  );
});

// Change user password (admin only or own password)
router.post('/users/:id/password', auth, (req, res) => {
  const { password } = req.body;
  const userId = parseInt(req.params.id);

  db.get(
    'SELECT username FROM users WHERE id = ?',
    [req.user.userId],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Check if user is admin or changing their own password
      if (!user || (user.username !== 'admin' && req.user.userId !== userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      try {
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, userId],
          (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            res.json({ message: 'Password updated successfully' });
          }
        );
      } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );
});

// Delete user (admin only)
router.delete('/users/:id', auth, (req, res) => {
  const userId = parseInt(req.params.id);

  db.get(
    'SELECT username FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user || user.username !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Prevent deleting admin user
      db.get(
        'SELECT username FROM users WHERE id = ?',
        [userId],
        (err, targetUser) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
          }

          if (targetUser.username === 'admin') {
            return res.status(403).json({ error: 'Cannot delete admin user' });
          }

          db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            res.json({ message: 'User deleted successfully' });
          });
        }
      );
    }
  );
});

module.exports = router;
