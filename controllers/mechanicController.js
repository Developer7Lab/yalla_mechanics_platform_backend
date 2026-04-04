const User = require('../models/User');
const Review = require('../models/Review');
const LocationRequest = require('../models/LocationRequest');
const MechanicLocation = require('../models/MechanicLocation');
const Breakdown = require('../models/Breakdown');

// ========== Profile Management ==========

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

exports.updateProfile = async (req, res) => {
  try {
    const { username, fullName, email, profileData } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email.toLowerCase();
    if (profileData) updateData.profileData = profileData;

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

// ========== Location Management ==========

exports.getLocation = async (req, res) => {
  try {
    const location = await MechanicLocation.findOne({ mechanicId: req.user.userId });
    res.json({
      success: true,
      data: location || null
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.createLocationRequest = async (req, res) => {
  try {
    const { businessName, address } = req.body;

    if (!address || address.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const pendingRequest = await LocationRequest.findOne({
      mechanicId: req.user.userId,
      status: 'pending'
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending location request. Please wait for admin approval.'
      });
    }

    const locationRequest = new LocationRequest({
      mechanicId: req.user.userId,
      businessName: businessName || '',
      address: address.trim(),
      status: 'pending'
    });

    await locationRequest.save();

    res.status(201).json({
      success: true,
      message: 'Location request submitted successfully. Waiting for admin approval.',
      data: locationRequest
    });
  } catch (error) {
    console.error('Error submitting location request:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getLocationRequests = async (req, res) => {
  try {
    const requests = await LocationRequest.find({ mechanicId: req.user.userId })
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching location requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// ========== Notifications ==========

exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('notifications');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const notifications = user.notifications.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.userId },
      { $set: { "notifications.$[].read": true } }
    );
    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// ========== Reviews ==========

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ mechanicId: req.user.userId })
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      count: reviews.length,
      data: {
        reviews,
        totalReviews: reviews.length,
        averageRating: avgRating.toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// ========== ✅ Submit Report (JSON-based) ==========

exports.submitReport = async (req, res) => {
  try {
    const { solutionSummary, finalPrice, currency, spareParts, mechanicNotes } = req.body;

    // Validation
    if (!solutionSummary || solutionSummary.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Solution summary is required'
      });
    }

    if (!finalPrice || finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Final price must be greater than 0'
      });
    }

    const breakdown = await Breakdown.findById(req.params.breakdownId);
    
    if (!breakdown) {
      return res.status(404).json({
        success: false,
        error: 'Breakdown not found'
      });
    }

    // تحقق إن الميكانيكي هو المكلّف بالطلب
    if (!breakdown.assignedMechanic || breakdown.assignedMechanic.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this breakdown'
      });
    }

    if (breakdown.status !== 'inProgress') {
      return res.status(400).json({
        success: false,
        error: 'Breakdown is not in progress'
      });
    }

    // ✅ حفظ بيانات التقرير كـ JSON
    breakdown.reportData = {
      solutionSummary: solutionSummary.trim(),
      finalPrice: Number(finalPrice),
      currency: currency || 'JOD',
      spareParts: spareParts || [],
      mechanicNotes: mechanicNotes || '',
      submittedAt: new Date()
    };

    breakdown.status = 'resolved';
    await breakdown.save();

    // إشعار للمستخدم
    const user = await User.findById(breakdown.userId);
    if (user) {
      user.notifications.push({
        message: `تم إرسال تقرير الإصلاح لطلبك: ${breakdown.title}`,
        type: 'success'
      });
      await user.save();
    }

    res.json({
      success: true,
      message: 'Report submitted successfully',
      data: breakdown
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};