const User = require('../models/User');
const LocationRequest = require('../models/LocationRequest');
const MechanicLocation = require('../models/MechanicLocation');
const Review = require('../models/Review');
const { searchLocation } = require('../utils/serpapi');

exports.getProfile = async (req, res) => {
  try {
const user = await User.findById(req.user.id).select('-password');
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
    if (email) updateData.email = email;
    if (profileData) updateData.profileData = profileData;

if (username && username !== req.user.username) {
  const existingUser = await User.findOne({
    username: username.toLowerCase(),
    _id: { $ne: req.user.id }
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
      req.user.id,
      updateData,
      { new: true }
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

exports.getPendingLocationRequests = async (req, res) => {
  try {
    const requests = await LocationRequest.find({ status: 'pending' })
      .populate('mechanicId', 'fullName username email profileData')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getAllLocationRequests = async (req, res) => {
  try {
    const requests = await LocationRequest.find()
      .populate('mechanicId', 'fullName username email')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.verifyLocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const serpApiKey = process.env.SERPAPI_KEY;

    if (!serpApiKey) {
      return res.status(500).json({
        success: false,
        error: 'SerpAPI key not configured'
      });
    }

    const request = await LocationRequest.findById(requestId)
      .populate('mechanicId', 'fullName username email');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    const searchQuery = request.businessName || request.address;
    const results = await searchLocation(searchQuery, serpApiKey);

    res.json({
      success: true,
      data: {
        request,
        results,
        found: results.length > 0
      }
    });
  } catch (error) {
    console.error('Error verifying request:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during verification'
    });
  }
};

exports.approveLocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { selectedLocation } = req.body;

    const request = await LocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Request has already been processed'
      });
    }

    const finalLocationData = selectedLocation || {
      title: request.businessName || 'Mechanic Shop',
      address: request.address,
      note: 'Approved without specific SerpAPI match'
    };

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

    request.status = 'approved';
    request.locationData = finalLocationData;
    request.processedAt = new Date();
    request.processedBy = req.user.id;
    await request.save();

    res.json({
      success: true,
      message: 'Location request approved successfully',
      data: {
        request,
        locationData: finalLocationData
      }
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.rejectLocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await LocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Request has already been processed'
      });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || 'No reason provided';
    request.processedAt = new Date();
    request.processedBy = req.user.id;
    await request.save();

    res.json({
      success: true,
      message: 'Location request rejected',
      data: request
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.removeMechanicLocation = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    await MechanicLocation.findOneAndDelete({ mechanicId });

    await User.findByIdAndUpdate(mechanicId, {
      $push: {
        notifications: {
          message: 'Your business location and name have been removed by the administrator.',
          type: 'warning',
          createdAt: new Date()
        }
      }
    });

    res.json({
      success: true,
      message: 'Location removed and mechanic notified successfully'
    });
  } catch (error) {
    console.error('Error removing location:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getAllMechanics = async (req, res) => {
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

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin accounts'
      });
    }

    await Review.deleteMany({ userId: userId });

    if (user.role === 'mechanic') {
      await MechanicLocation.deleteMany({ mechanicId: userId });
      await LocationRequest.deleteMany({ mechanicId: userId });
      await Review.deleteMany({ mechanicId: userId });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User account deleted successfully`,
      data: {
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.deleteMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    if (mechanicId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found'
      });
    }

    if (mechanic.role !== 'mechanic') {
      return res.status(400).json({
        success: false,
        error: 'User is not a mechanic'
      });
    }

    await MechanicLocation.deleteMany({ mechanicId: mechanicId });
    await LocationRequest.deleteMany({ mechanicId: mechanicId });
    await Review.deleteMany({ mechanicId: mechanicId });
    await User.findByIdAndDelete(mechanicId);

    res.json({
      success: true,
      message: `Mechanic account deleted successfully`,
      data: {
        username: mechanic.username,
        fullName: mechanic.fullName
      }
    });
  } catch (error) {
    console.error('Error deleting mechanic:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalMechanics = await User.countDocuments({ role: 'mechanic' });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingRequests = await LocationRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await LocationRequest.countDocuments({ status: 'approved' });
    const rejectedRequests = await LocationRequest.countDocuments({ status: 'rejected' });
    const mechanicsWithLocation = await MechanicLocation.countDocuments();

    res.json({
      success: true,
      data: {
        totalMechanics,
        totalUsers,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        mechanicsWithLocation
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};