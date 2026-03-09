const express = require('express');
const router = express.Router();
const { isAuthenticated, isRole } = require('../middleware/auth');
const User = require('../models/User');
const Review = require('../models/Review');
const MechanicLocation = require('../models/MechanicLocation');

// Get user profile
router.get('/profile', isRole('user'), async (req, res) => {
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

// Update user profile (including username)
router.put('/profile', isRole('user'), async (req, res) => {
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

// Get all mechanics with their locations
router.get('/mechanics', isRole('user'), async (req, res) => {
  try {
    const mechanics = await User.find({ role: 'mechanic' }).select('-password');

    // Get locations for each mechanic
    const mechanicsWithLocations = await Promise.all(
      mechanics.map(async (mechanic) => {
        const location = await MechanicLocation.findOne({ mechanicId: mechanic._id });
        return {
          ...mechanic.toObject(),
          location: location || null
        };
      })
    );

    res.json(mechanicsWithLocations);
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reviews for a specific mechanic
router.get('/mechanics/:mechanicId/reviews', isRole('user'), async (req, res) => {
  try {
    const reviews = await Review.find({ mechanicId: req.params.mechanicId })
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a review for a mechanic
router.post('/reviews', isRole('user'), async (req, res) => {
  try {
    const { mechanicId, rating, comment } = req.body;

    if (!mechanicId || !rating || !comment) {
      return res.status(400).json({ error: 'Mechanic ID, rating, and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if mechanic exists
    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic' });
    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    // Check if user already reviewed this mechanic
    const existingReview = await Review.findOne({
      userId: req.session.userId,
      mechanicId: mechanicId
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = new Date();
      await existingReview.save();

      const populatedReview = await Review.findById(existingReview._id)
        .populate('userId', 'fullName username');

      return res.json({ message: 'Review updated successfully', review: populatedReview });
    }

    // Create new review
    const review = new Review({
      userId: req.session.userId,
      mechanicId,
      rating,
      comment
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'fullName username');

    res.status(201).json({ message: 'Review submitted successfully', review: populatedReview });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's own reviews
router.get('/my-reviews', isRole('user'), async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.session.userId })
      .populate('mechanicId', 'fullName username')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;