const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, fullName, email, profileData } = req.body;

    // Validation
    if (!username || !password || !role || !fullName || !email) {
      return res.status(400).json({
        error: 'Username, password, role, full name, and email are required'
      });
    }

    // Validate role
    if (!['user', 'mechanic'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be either "user" or "mechanic"'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      password,
      role,
      fullName,
      email: email.toLowerCase(),
      profileData: profileData || {}
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;

    res.json({
      success: true,
      role: user.role,
      username: user.username,
      fullName: user.fullName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check session route
router.get('/check-session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      role: req.session.userRole,
      username: req.session.username
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;