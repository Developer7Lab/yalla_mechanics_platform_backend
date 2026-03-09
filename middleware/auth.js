// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please login.' });
};

// Role-based authorization middleware
const isRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = {
  isAuthenticated,
  isRole
};
