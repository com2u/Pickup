const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all orders
router.get('/', auth, (req, res) => {
  const query = `SELECT o.*, i.name as item_name, u.username 
     FROM orders o 
     JOIN items i ON o.item_id = i.id 
     JOIN users u ON o.user_id = u.id 
     ORDER BY o.created_at DESC`;
  logger.debug('Executing get all orders query', { query });
  
  db.all(
    query,
    [],
    (err, orders) => {
      if (err) {
        logger.error('Database error in get all orders:', err);
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

  const insertQuery = 'INSERT INTO orders (user_id, item_id, quantity) VALUES (?, ?, ?)';
  const params = [userId, itemId, quantity];
  logger.debug('Executing create order query', { query: insertQuery, params });
  
  db.run(
    insertQuery,
    params,
    function (err) {
      if (err) {
        logger.error('Database error in create new order:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const selectQuery = `SELECT o.*, i.name as item_name, u.username 
         FROM orders o 
         JOIN items i ON o.item_id = i.id 
         JOIN users u ON o.user_id = u.id 
         WHERE o.id = ?`;
      logger.debug('Executing get created order query', { 
        query: selectQuery, 
        params: [this.lastID],
        lastInsertId: this.lastID 
      });
      
      db.get(
        selectQuery,
        [this.lastID],
        (err, order) => {
          if (err) {
            logger.error('Database error in get created order:', err);
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
  const userQuery = 'SELECT username FROM users WHERE id = ?';
  logger.debug('Executing get user query', { 
    query: userQuery, 
    params: [req.user.userId] 
  });
  
  db.get(
    userQuery,
    [req.user.userId],
    (err, user) => {
      if (err) {
        logger.error('Database error in get user for batch update:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const isAdmin = user && user.username === 'admin';
      const userId = req.user.userId;

      if (!Array.isArray(orders)) {
        return res.status(400).json({ error: 'Orders must be an array' });
      }

      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');

        try {
          // Process orders sequentially using async/await
          const processOrders = async () => {
            for (const order of orders) {
              // Only allow admin to update other users' orders
              if (!isAdmin && order.userId !== userId) {
                throw new Error('Unauthorized to update other users\' orders');
              }

              // Log incoming order data for debugging
              logger.debug('Processing order', { order });

              // Validate order data
              if (!order || typeof order !== 'object') {
                logger.error('Invalid order format', { order });
                throw new Error('Invalid order format');
              }

              const orderUserId = isAdmin ? order.userId : userId;
              const itemId = order.itemId;
              const quantity = order.quantity;

              // Log parsed values for debugging
              logger.debug('Parsed order values', { 
                orderUserId, 
                itemId, 
                quantity,
                isAdmin,
                originalUserId: order.userId
              });

              // Detailed field validation
              const validationErrors = [];
              if (!orderUserId) validationErrors.push('missing user_id');
              if (!itemId) validationErrors.push('missing item_id');
              if (quantity === undefined || quantity === null) validationErrors.push('missing quantity');
              if (typeof quantity !== 'number') validationErrors.push('quantity must be a number');

              if (validationErrors.length > 0) {
                const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
                logger.error(errorMessage, { orderUserId, itemId, quantity });
                throw new Error(errorMessage);
              }

              // Process order based on quantity
              if (quantity && quantity > 0) {
                logger.debug('Processing order with quantity > 0', { quantity });
                
                // Try to update existing order
                await new Promise((resolve, reject) => {
                  const updateQuery = 'UPDATE orders SET quantity = ? WHERE user_id = ? AND item_id = ?';
                  const updateParams = [quantity, orderUserId, itemId];
                  logger.debug('Executing update order query', { 
                    query: updateQuery, 
                    params: updateParams 
                  });
                  
                  db.run(updateQuery, updateParams, function(err) {
                    if (err) {
                      logger.error('Error updating order:', err);
                      reject(new Error(`Failed to update order: ${err.message}`));
                      return;
                    }
                    
                    // If no rows were updated, insert new order
                    if (this.changes === 0) {
                      logger.debug('No existing order found, inserting new order', {
                        orderUserId,
                        itemId,
                        quantity
                      });

                      const insertQuery = 'INSERT INTO orders (user_id, item_id, quantity) VALUES (?, ?, ?)';
                      const insertParams = [orderUserId, itemId, quantity];
                      logger.debug('Executing insert order query', { 
                        query: insertQuery, 
                        params: insertParams 
                      });
                      
                      db.run(insertQuery, insertParams, function(err) {
                        if (err) {
                          logger.error('Error inserting order:', err);
                          reject(new Error(`Failed to insert order: ${err.message}`));
                          return;
                        }
                        logger.debug('Successfully inserted new order', {
                          lastID: this.lastID,
                          changes: this.changes
                        });
                        resolve();
                      });
                    } else {
                      resolve();
                    }
                  });
                });
              } else if (quantity === 0) {
                logger.debug('Processing order with quantity = 0 (delete)');
                
                // Delete order
                await new Promise((resolve, reject) => {
                  const deleteQuery = 'DELETE FROM orders WHERE user_id = ? AND item_id = ?';
                  const deleteParams = [orderUserId, itemId];
                  logger.debug('Executing delete order query', { 
                    query: deleteQuery, 
                    params: deleteParams 
                  });
                  
                  db.run(deleteQuery, deleteParams, (err) => {
                    if (err) {
                      logger.error('Error deleting order:', err);
                      reject(new Error(`Failed to delete order: ${err.message}`));
                      return;
                    }
                    resolve();
                  });
                });
              }
            }
          };

          try {
            // Process all orders and commit
            await processOrders();
            
            await new Promise((resolve, reject) => {
              db.run('COMMIT', (err) => {
                if (err) {
                  logger.error('Error committing transaction:', err);
                  reject(new Error(`Failed to commit transaction: ${err.message}`));
                  return;
                }
                resolve();
              });
            });

            res.json({ message: 'Orders updated successfully' });
          } catch (err) {
            throw err;
          }
        } catch (err) {
          db.run('ROLLBACK');
          logger.error('Error in batch order processing:', err);
          // Send more specific error message to client
          return res.status(400).json({ 
            error: err.message || 'Failed to process orders',
            details: err.code === 'SQLITE_CONSTRAINT' ? 'Database constraint violation - check required fields' : undefined
          });
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
      const userQuery = 'SELECT id, username FROM users WHERE username IN (' + 
        Object.keys(userTotals).map(() => '?').join(',') + ')';
      const userParams = Object.keys(userTotals);
      logger.debug('Executing get users query', { 
        query: userQuery, 
        params: userParams 
      });
      
      db.all(
        userQuery,
        userParams,
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
      logger.error('Error in balance history:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Get user balances
router.get('/balances', auth, (req, res) => {
  const balanceQuery = `SELECT u.id, u.username,
            COALESCE(SUM(bh.amount), 0) as current_balance
     FROM users u
     LEFT JOIN balance_history bh ON u.id = bh.user_id
     GROUP BY u.id
     ORDER BY u.username`;
  logger.debug('Executing get balances query', { query: balanceQuery });
  
  db.all(
    balanceQuery,
    [],
    (err, balances) => {
      if (err) {
        logger.error('Error getting user balances:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(balances);
    }
  );
});

// Get balance history
router.get('/balance-history', auth, (req, res) => {
  const historyQuery = `SELECT bh.*, u.username
     FROM balance_history bh
     JOIN users u ON bh.user_id = u.id
     ORDER BY bh.created_at DESC`;
  logger.debug('Executing get balance history query', { query: historyQuery });
  
  db.all(
    historyQuery,
    [],
    (err, history) => {
      if (err) {
        logger.error('Error getting balance history:', err);
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

  const correctionQuery = 'INSERT INTO balance_history (user_id, amount, description) VALUES (?, ?, ?)';
  const correctionParams = [userId, amount, description];
  logger.debug('Executing balance correction query', { 
    query: correctionQuery, 
    params: correctionParams 
  });
  
  db.run(
    correctionQuery,
    correctionParams,
    function (err) {
      if (err) {
        logger.error('Error in balance correction:', err);
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
