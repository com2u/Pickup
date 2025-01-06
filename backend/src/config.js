require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3002,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  
  database: {
    path: process.env.DB_PATH || 'src/db',
    filename: process.env.DB_FILENAME || 'pickup.db',
    get fullPath() {
      return `${this.path}/${this.filename}`;
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'src/logs/app.log',
  },
};

module.exports = config;
