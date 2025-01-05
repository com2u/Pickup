const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', auth, (req, res) => {
  db.all(
    `SELECT o.*, i.name as item_name, u.username 
     FROM orders o 
     JOIN items i ON o.item_id = i.id 
     JOIN users u ON o.user_id = u.id 
     ORDER BY o.created_at DESC`,
    [],
    (err, orders) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(orders);
    }
  );
});

// Create new order
router.post('/', auth, (req, res) => {
  const { itemId, quantity } = req.body;
  const userId = req.user.userId;

  if (!itemId || typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ error: 'Valid item ID and quantity are required' });
  }

  db.run(
    'INSERT INTO orders (user_id, item_id, quantity) VALUES (?, ?, ?)',
    [userId, itemId, quantity],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      db.get(
        `SELECT o.*, i.name as item_name, u.username 
         FROM orders o 
         JOIN items i ON o.item_id = i.id 
         JOIN users u ON o.user_id = u.id 
         WHERE o.id = ?`,
        [this.lastID],
        (err, order) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          res.status(201).json(order);
        }
      );
    }
  );
});

// Update multiple orders at once
router.post('/batch', auth, (req, res) => {
  const { orders } = req.body;
  // Check if user is admin
  db.get(
    'SELECT username FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const isAdmin = user && user.username === 'admin';
      const userId = req.user.userId;

      if (!Array.isArray(orders)) {
        return res.status(400).json({ error: 'Orders must be an array' });
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
          // Process each order
          for (const order of orders) {
            // Only allow admin to update other users' orders
            if (!isAdmin && order.userId !== userId) {
              throw new Error('Unauthorized to update other users\' orders');
            }

            const orderUserId = isAdmin ? order.userId : userId;

            if (order.quantity > 0) {
              // Try to update existing order
              db.run(
                'UPDATE orders SET quantity = ? WHERE user_id = ? AND item_id = ?',
                [order.quantity, orderUserId, order.itemId],
                function(err) {
                  if (err) {
                    throw err;
                  }
                  // If no rows were updated, insert new order
                  if (this.changes === 0) {
                    db.run(
                      'INSERT INTO orders (user_id, item_id, quantity) VALUES (?, ?, ?)',
                      [orderUserId, order.itemId, order.quantity],
                      (err) => {
                        if (err) {
                          throw err;
                        }
                      }
                    );
                  }
                }
              );
            } else {
              // Delete order if quantity is 0
              db.run(
                'DELETE FROM orders WHERE user_id = ? AND item_id = ?',
                [orderUserId, order.itemId],
                (err) => {
                  if (err) {
                    throw err;
                  }
                }
              );
            }
          }

          db.run('COMMIT', (err) => {
            if (err) {
              throw err;
            }
            res.json({ message: 'Orders updated successfully' });
          });
        } catch (err) {
          db.run('ROLLBACK');
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
      });
    }
  );
});

// Confirm delivery and update balances
router.post('/confirm-delivery', auth, (req, res) => {
  const { userId, userTotals } = req.body;

  if (!userId || !userTotals || typeof userTotals !== 'object') {
    return res.status(400).json({ error: 'User ID and user totals are required' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // Add negative balance entries for each user's orders
      const stmt = db.prepare(
        'INSERT INTO balance_history (user_id, amount, description) VALUES (?, ?, ?)'
      );

      // Get user IDs from usernames
      db.all(
        'SELECT id, username FROM users WHERE username IN (' + 
        Object.keys(userTotals).map(() => '?').join(',') + ')',
        Object.keys(userTotals),
        (err, users) => {
          if (err) throw err;

          const userIdMap = users.reduce((acc, user) => {
            acc[user.username] = user.id;
            return acc;
          }, {});

          // Add negative balance entries for each user
          Object.entries(userTotals).forEach(([username, total]) => {
            const userId = userIdMap[username];
            if (userId) {
              stmt.run(userId, -total, 'Order payment');
            }
          });

          // Add positive balance entry for the delivering user
          const totalAmount = Object.values(userTotals).reduce((sum, t) => sum + t, 0);
          stmt.run(userId, totalAmount, 'Payment received');

          stmt.finalize((err) => {
            if (err) throw err;

            // Clear all orders
            db.run('DELETE FROM orders', [], (err) => {
              if (err) throw err;

              db.run('COMMIT', (err) => {
                if (err) throw err;
                res.json({ message: 'Delivery confirmed and balances updated' });
              });
            });
          });
        }
      );
    } catch (err) {
      db.run('ROLLBACK');
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Get user balances
router.get('/balances', auth, (req, res) => {
  db.all(
    `SELECT u.id, u.username,
            COALESCE(SUM(bh.amount), 0) as current_balance
     FROM users u
     LEFT JOIN balance_history bh ON u.id = bh.user_id
     GROUP BY u.id
     ORDER BY u.username`,
    [],
    (err, balances) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(balances);
    }
  );
});

// Get balance history
router.get('/balance-history', auth, (req, res) => {
  db.all(
    `SELECT bh.*, u.username
     FROM balance_history bh
     JOIN users u ON bh.user_id = u.id
     ORDER BY bh.created_at DESC`,
    [],
    (err, history) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(history);
    }
  );
});

// Add balance correction
router.post('/balance-correction', auth, (req, res) => {
  const { userId, amount, description } = req.body;

  if (!userId || typeof amount !== 'number' || !description) {
    return res.status(400).json({
      error: 'User ID, amount, and description are required',
    });
  }

  db.run(
    'INSERT INTO balance_history (user_id, amount, description) VALUES (?, ?, ?)',
    [userId, amount, description],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        amount,
        description,
        created_at: new Date().toISOString(),
      });
    }
  );
});

module.exports = router;
