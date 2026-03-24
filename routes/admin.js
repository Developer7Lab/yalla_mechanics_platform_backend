const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const Breakdown = require('../models/Breakdown');
const path = require('path');
const fs = require('fs');

router.use(protect('admin'));

router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

router.get('/location-requests/pending', adminController.getPendingLocationRequests);
router.get('/location-requests', adminController.getAllLocationRequests);
router.get('/location-requests/:requestId/verify', adminController.verifyLocationRequest);
router.post('/location-requests/:requestId/approve', adminController.approveLocationRequest);
router.post('/location-requests/:requestId/reject', adminController.rejectLocationRequest);

router.get('/mechanics', adminController.getAllMechanics);
router.delete('/mechanics/:mechanicId/location', adminController.removeMechanicLocation);
router.delete('/mechanics/:mechanicId', adminController.deleteMechanic);

router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);

router.get('/stats', adminController.getStats);


router.get('/breakdowns', async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [breakdowns, total] = await Promise.all([
      Breakdown.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'fullName username email')
        .populate('assignedMechanic', 'fullName username'),
      Breakdown.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: breakdowns.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: breakdowns
    });
  } catch (error) {
    console.error('Error fetching breakdowns:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.patch('/breakdowns/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'inProgress', 'resolved', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const breakdown = await Breakdown.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'fullName username');

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    res.json({ success: true, message: 'Status updated', data: breakdown });
  } catch (error) {
    console.error('Error updating breakdown status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/breakdowns/:id', async (req, res) => {
  try {
    const breakdown = await Breakdown.findByIdAndDelete(req.params.id);

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    breakdown.photos?.forEach(photo => {
      const filePath = path.join(__dirname, '..', 'public', photo.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    res.json({ success: true, message: 'Breakdown deleted successfully' });
  } catch (error) {
    console.error('Error deleting breakdown:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;