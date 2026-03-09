const express = require('express');
const router = express.Router();
const { isAuthenticated, isRole } = require('../middleware/auth');
const User = require('../models/User');
const LocationRequest = require('../models/LocationRequest');
const MechanicLocation = require('../models/MechanicLocation');
const { searchLocation } = require('../utils/serpapi');

// Get admin profile
router.get('/profile', isRole('admin'), async (req, res) => {
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

// Update admin profile (including username)
router.put('/profile', isRole('admin'), async (req, res) => {
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

// Get all pending location requests
router.get('/location-requests/pending', isRole('admin'), async (req, res) => {
  try {
    const requests = await LocationRequest.find({ status: 'pending' })
      .populate('mechanicId', 'fullName username email profileData')
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all location requests (all statuses)
router.get('/location-requests', isRole('admin'), async (req, res) => {
  try {
    const requests = await LocationRequest.find()
      .populate('mechanicId', 'fullName username email')
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify location request (search SerpAPI without saving)
router.get('/location-requests/:requestId/verify', isRole('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const serpApiKey = process.env.SERPAPI_KEY;

    if (!serpApiKey) {
      return res.status(500).json({ error: 'SerpAPI key not configured' });
    }

    const request = await LocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Prioritize searching by name only as requested
    const searchQuery = request.businessName || request.address;

    const results = await searchLocation(searchQuery, serpApiKey);

    res.json({
      request,
      results,
      found: results.length > 0
    });
  } catch (error) {
    console.error('Error verifying request:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// Approve location request (with specific location data)
router.post('/location-requests/:requestId/approve', isRole('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { selectedLocation } = req.body; // Admin can pass the specific result they chose

    const request = await LocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Use selected location or fallback to request data
    const finalLocationData = selectedLocation || {
      title: request.businessName || 'Mechanic Shop',
      address: request.address,
      note: 'Approved without specific SerpAPI match'
    };

    // Update or create mechanic location
    await MechanicLocation.findOneAndUpdate(
      { mechanicId: request.mechanicId },
      {
        mechanicId: request.mechanicId,
        businessName: finalLocationData.title || request.businessName,
        address: finalLocationData.address || request.address,
        locationData: finalLocationData,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update request status
    request.status = 'approved';
    request.locationData = finalLocationData;
    request.processedAt = new Date();
    request.processedBy = req.session.userId;
    await request.save();

    res.json({
      message: 'Location request approved successfully',
      request,
      locationData: finalLocationData
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject location request
router.post('/location-requests/:requestId/reject', isRole('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await LocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || 'No reason provided';
    request.processedAt = new Date();
    request.processedBy = req.session.userId;
    await request.save();

    res.json({
      message: 'Location request rejected',
      request
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove mechanic location and notify them
router.delete('/mechanics/:mechanicId/location', isRole('admin'), async (req, res) => {
  try {
    const { mechanicId } = req.params;

    // Remove the location
    await MechanicLocation.findOneAndDelete({ mechanicId });

    // Notify the mechanic
    await User.findByIdAndUpdate(mechanicId, {
      $push: {
        notifications: {
          message: 'Your business location and name have been removed by the administrator.',
          type: 'warning',
          createdAt: new Date()
        }
      }
    });

    res.json({ message: 'Location removed and mechanic notified successfully' });
  } catch (error) {
    console.error('Error removing location:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all mechanics with their locations
router.get('/mechanics', isRole('admin'), async (req, res) => {
  try {
    const mechanics = await User.find({ role: 'mechanic' }).select('-password');

    const mechanicsWithLocations = await Promise.all(
      mechanics.map(async (mechanic) => {
        const location = await MechanicLocation.findOne({ mechanicId: mechanic._id });
        const pendingRequests = await LocationRequest.countDocuments({
          mechanicId: mechanic._id,
          status: 'pending'
        });

        return {
          ...mechanic.toObject(),
          location: location || null,
          pendingRequests
        };
      })
    );

    res.json(mechanicsWithLocations);
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
router.get('/stats', isRole('admin'), async (req, res) => {
  try {
    const totalMechanics = await User.countDocuments({ role: 'mechanic' });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingRequests = await LocationRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await LocationRequest.countDocuments({ status: 'approved' });
    const rejectedRequests = await LocationRequest.countDocuments({ status: 'rejected' });
    const mechanicsWithLocation = await MechanicLocation.countDocuments();

    res.json({
      totalMechanics,
      totalUsers,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      mechanicsWithLocation
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;