const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
// تم تعديل البورت الافتراضي إلى 3001 لأن 3000 محجوز للفرونت-إيند
const PORT = process.env.PORT || 3001; 

// ==========================================
// 1. إعدادات الـ CORS (يجب أن تكون في الأعلى دائماً)
// ==========================================
app.use(cors({
  origin: 'http://localhost:3000', // السماح للفرونت-إيند بالوصول
  credentials: true, // السماح بإرسال الكوكيز أو التوكنز
}));

// ==========================================
// 2. إعدادات الحماية والـ Middleware الأخرى
// ==========================================
// تم تعديل Helmet ليسمح بالـ Cross-Origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser middleware (يفضل وضعه هنا ليكون متاحاً لباقي الطلبات)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ==========================================
// 3. الاتصال بقاعدة البيانات
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mechanic-app';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// ==========================================
// 4. المسارات (Routes)
// ==========================================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mechanicRoutes = require('./routes/mechanics');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mechanic App API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// ==========================================
// 5. معالجة الأخطاء (Error Handling)
// ==========================================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value entered'
    });
  }

  // JWT errors
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

// ==========================================
// 6. تشغيل وإغلاق السيرفر
// ==========================================
// Graceful shutdown
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

// Start server
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