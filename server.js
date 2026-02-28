require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./backend/config/database');
const errorHandler = require('./backend/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/violations', require('./backend/routes/violations'));
app.use('/api/audit', require('./backend/routes/audit'));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('\x1b[33m');
  console.log('  ╔════════════════════════════════════╗');
  console.log('  ║   🚦 TrafficGuard System v2.0      ║');
  console.log('  ╚════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log(`\x1b[32m  ✅ Server running on http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m  📡 API: http://localhost:${PORT}/api/violations\x1b[0m`);
  console.log(`\x1b[35m  📦 MongoDB: ${process.env.MONGODB_URI}\x1b[0m`);
  console.log('');
});
