const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3001; 


app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, 
}));


app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, 
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mechanic-app';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mechanicRoutes = require('./routes/mechanics');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mechanic App API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});


app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value entered'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🔧 Mechanic App REST API Server    ║
╚═══════════════════════════════════════╝

  ➜ Server:      http://localhost:${PORT}
  ➜ Environment: ${process.env.NODE_ENV || 'development'}
  ➜ Database:    ${MONGODB_URI.includes('localhost') ? 'Local MongoDB' : 'Cloud MongoDB'}
  ➜ Security:    ✓ CORS, Helmet, Rate Limiting, JWT

  📚 API Documentation:
  ➜ Health:      GET  /api/health
  ➜ Register:    POST /api/auth/register
  ➜ Login:       POST /api/auth/login
  ➜ Refresh:     POST /api/auth/refresh

  🔐 Authentication: JWT Bearer Token

  Ready to accept requests! 🚀
  `);
});