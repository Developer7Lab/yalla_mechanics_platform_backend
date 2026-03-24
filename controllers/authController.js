const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');

exports.register = async (req, res) => {
  try {
    const { username, password, role, fullName, email, profileData } = req.body;

    if (!username || !password || !role || !fullName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, role, full name, and email are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    if (!['user', 'mechanic'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be either "user" or "mechanic"'
      });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password,
      role,
      fullName,
      email: email.toLowerCase(),
      profileData: profileData || {}
    });

    await newUser.save();

    const accessToken = generateAccessToken({
      userId: newUser._id,
      username: newUser.username,
      role: newUser.role
    });

    const refreshToken = generateRefreshToken({
      userId: newUser._id
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          role: newUser.role,
          fullName: newUser.fullName,
          email: newUser.email
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const accessToken = generateAccessToken({
      userId: user._id,
      username: user.username,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      userId: user._id
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          email: user.email
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists'
      });
    }

    const newAccessToken = generateAccessToken({
      userId: user._id,
      username: user.username,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired refresh token'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client.'
  });
};