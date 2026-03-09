const express = require('express');
const router = express.Router();
const { isAuthenticated, isRole } = require('../middleware/auth');
const User = require('../models/User');
const Review = require('../models/Review');
const LocationRequest = require('../models/LocationRequest');
const MechanicLocation = require('../models/MechanicLocation');

// Get mechanic profile
router.get('/profile', isRole('mechanic'), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mechanic profile (including username)
router.put('/profile', isRole('mechanic'), async (req, res) => {
  try {
    const { username, fullName, email, profileData } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (profileData) updateData.profileData = profileData;

    // Handle username change separately to check for uniqueness
    if (username && username !== req.session.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: req.session.userId }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      updateData.username = username.toLowerCase();

      // Update session with new username
      req.session.username = username.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mechanic's current location
router.get('/location', isRole('mechanic'), async (req, res) => {
  try {
    const location = await MechanicLocation.findOne({ mechanicId: req.session.userId });
    res.json(location || null);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit location update request
router.post('/location-request', isRole('mechanic'), async (req, res) => {
  try {
    const { businessName, address } = req.body;

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Check if there's already a pending request
    const pendingRequest = await LocationRequest.findOne({
      mechanicId: req.session.userId,
      status: 'pending'
    });

    if (pendingRequest) {
      return res.status(400).json({
        error: 'You already have a pending location request. Please wait for admin approval.'
      });
    }

    const locationRequest = new LocationRequest({
      mechanicId: req.session.userId,
      businessName: businessName || '',
      address: address.trim(),
      status: 'pending'
    });

    await locationRequest.save();

    res.status(201).json({
      message: 'Location request submitted successfully. Waiting for admin approval.',
      request: locationRequest
    });
  } catch (error) {
    console.error('Error submitting location request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mechanic's location requests
router.get('/location-requests', isRole('mechanic'), async (req, res) => {
  try {
    const requests = await LocationRequest.find({ mechanicId: req.session.userId })
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching location requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications for mechanic
router.get('/notifications', isRole('mechanic'), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('notifications');
    res.json(user.notifications.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notifications as read
router.post('/notifications/read', isRole('mechanic'), async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.session.userId },
      { $set: { "notifications.$[].read": true } }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reviews for this mechanic
router.get('/reviews', isRole('mechanic'), async (req, res) => {
  try {
    const reviews = await Review.find({ mechanicId: req.session.userId })
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      totalReviews: reviews.length,
      averageRating: avgRating.toFixed(1)
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;