const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config');

// Ensure we use absolute path for database
const dbPath = path.resolve(process.cwd(), config.database.path, config.database.filename);
const db = new sqlite3.Database(dbPath);

console.log(`Database connected at: ${dbPath}`);

module.exports = { db };
