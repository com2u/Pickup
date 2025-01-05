const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'pickup.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create items table
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table with unique constraint
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (item_id) REFERENCES items (id),
        UNIQUE(user_id, item_id)
      )
    `);

    // Create balance_history table
    db.run(`
      CREATE TABLE IF NOT EXISTS balance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Check if admin user exists
    db.get("SELECT id FROM users WHERE username = 'admin'", [], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }

      if (!row) {
        // Create admin user if it doesn't exist
        bcrypt.hash('admin', 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }

          db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            ['admin', hash],
            (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
                return;
              }
              console.log('Admin user created successfully');
            }
          );
        });
      }
    });

    // Add some default items if the items table is empty
    db.get("SELECT COUNT(*) as count FROM items", [], (err, row) => {
      if (err) {
        console.error('Error checking items:', err);
        return;
      }

      if (row.count === 0) {
        const defaultItems = [
          { name: 'Coffee', price: 2.50 },
          { name: 'Tea', price: 2.00 },
          { name: 'Espresso', price: 2.20 },
          { name: 'Cappuccino', price: 3.00 },
          { name: 'Latte', price: 3.20 },
          { name: 'Hot Chocolate', price: 3.00 },
          { name: 'Croissant', price: 2.50 },
          { name: 'Muffin', price: 2.00 },
          { name: 'Bagel', price: 2.50 },
          { name: 'Cookie', price: 1.50 }
        ];

        const stmt = db.prepare('INSERT INTO items (name, price) VALUES (?, ?)');
        defaultItems.forEach(item => {
          stmt.run(item.name, item.price);
        });
        stmt.finalize();
        console.log('Default items added successfully');
      }
    });
  });
};

module.exports = { initDatabase };
