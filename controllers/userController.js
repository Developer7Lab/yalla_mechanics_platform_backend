const User = require('../models/User');
const Review = require('../models/Review');
const MechanicLocation = require('../models/MechanicLocation');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private (User)
exports.getProfile = async (req, res) => {
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
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private (User)
exports.updateProfile = async (req, res) => {
  try {
    const { username, fullName, email, profileData } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email.toLowerCase();
    if (profileData) updateData.profileData = profileData;

    // Handle username change
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: req.user.userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }

      updateData.username = username.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get all mechanics with locations
// @route   GET /api/users/mechanics
// @access  Private (User)
exports.getMechanics = async (req, res) => {
  try {
    const mechanics = await User.find({ role: 'mechanic' }).select('-password');

    const mechanicsWithLocations = await Promise.all(
      mechanics.map(async (mechanic) => {
        const location = await MechanicLocation.findOne({ mechanicId: mechanic._id });
        return {
          ...mechanic.toObject(),
          location: location || null
        };
      })
    );

    res.json({
      success: true,
      count: mechanicsWithLocations.length,
      data: mechanicsWithLocations
    });
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get reviews for a specific mechanic
// @route   GET /api/users/mechanics/:mechanicId/reviews
// @access  Private (User)
exports.getMechanicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ mechanicId: req.params.mechanicId })
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Submit a review for a mechanic
// @route   POST /api/users/reviews
// @access  Private (User)
exports.createReview = async (req, res) => {
  try {
    const { mechanicId, rating, comment } = req.body;

    // Validation
    if (!mechanicId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Mechanic ID, rating, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 1000 characters'
      });
    }

    // Check if mechanic exists
    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic' });
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found'
      });
    }

    // Check if user already reviewed this mechanic
    const existingReview = await Review.findOne({
      userId: req.user.userId,
      mechanicId: mechanicId
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = new Date();
      await existingReview.save();

      const populatedReview = await Review.findById(existingReview._id)
        .populate('userId', 'fullName username');

      return res.json({
        success: true,
        message: 'Review updated successfully',
        data: populatedReview
      });
    }

    // Create new review
    const review = new Review({
      userId: req.user.userId,
      mechanicId,
      rating,
      comment
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'fullName username');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: populatedReview
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get user's own reviews
// @route   GET /api/users/my-reviews
// @access  Private (User)
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.userId })
      .populate('mechanicId', 'fullName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};