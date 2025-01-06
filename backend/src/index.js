const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const ordersRoutes = require('./routes/orders');
const config = require('./config');

const app = express();

// Initialize database
initDatabase();

// Middleware
app.use(cors({
  origin: config.cors.origin
}));
app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/orders', ordersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(config.server.port, config.server.host, () => {
  console.log(`Server running at http://${config.server.host}:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
});
