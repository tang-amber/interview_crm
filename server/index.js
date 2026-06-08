const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database then start server
initDatabase().then(() => {
  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/companies', require('./routes/companies'));
  app.use('/api', require('./routes/interactions'));
  app.use('/api', require('./routes/interviews'));
  app.use('/api/templates', require('./routes/templates'));
  app.use('/api/tags', require('./routes/tags'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/admin', require('./routes/admin'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
