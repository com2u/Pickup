const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all items
router.get('/', auth, (req, res) => {
  db.all('SELECT * FROM items ORDER BY name', [], (err, items) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(items);
  });
});

// Add new item
router.post('/', auth, (req, res) => {
  const { name, price } = req.body;

  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.run(
    'INSERT INTO items (name, price) VALUES (?, ?)',
    [name, price],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      db.get(
        'SELECT * FROM items WHERE id = ?',
        [this.lastID],
        (err, item) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          res.status(201).json(item);
        }
      );
    }
  );
});

// Update item
router.put('/:id', auth, (req, res) => {
  const { name, price } = req.body;
  const itemId = parseInt(req.params.id);

  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.run(
    'UPDATE items SET name = ?, price = ? WHERE id = ?',
    [name, price, itemId],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      db.get(
        'SELECT * FROM items WHERE id = ?',
        [itemId],
        (err, item) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          res.json(item);
        }
      );
    }
  );
});

// Delete item
router.delete('/:id', auth, (req, res) => {
  const itemId = parseInt(req.params.id);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // Delete associated orders first
      db.run(
        'DELETE FROM orders WHERE item_id = ?',
        [itemId],
        (err) => {
          if (err) throw err;
        }
      );

      // Then delete the item
      db.run(
        'DELETE FROM items WHERE id = ?',
        [itemId],
        function (err) {
          if (err) {
            throw err;
          }

          if (this.changes === 0) {
            throw new Error('Item not found');
          }

          db.run('COMMIT', (err) => {
            if (err) throw err;
            res.json({ message: 'Item deleted successfully' });
          });
        }
      );
    } catch (err) {
      db.run('ROLLBACK');
      console.error('Database error:', err);
      if (err.message === 'Item not found') {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

module.exports = router;
