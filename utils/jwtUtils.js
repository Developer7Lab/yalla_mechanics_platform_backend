const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';


exports.generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
    issuer: 'mechanic-app',
    audience: 'mechanic-app-users'
  });
};


exports.generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
    issuer: 'mechanic-app',
    audience: 'mechanic-app-users'
  });
};


exports.verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'mechanic-app',
      audience: 'mechanic-app-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};


exports.verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mechanic-app',
      audience: 'mechanic-app-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};


exports.decodeToken = (token) => {
  return jwt.decode(token);
};