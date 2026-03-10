const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All routes require authentication and 'admin' role
router.use(protect('admin'));

// Profile routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

// Location request routes
router.get('/location-requests/pending', adminController.getPendingLocationRequests);
router.get('/location-requests', adminController.getAllLocationRequests);
router.get('/location-requests/:requestId/verify', adminController.verifyLocationRequest);
router.post('/location-requests/:requestId/approve', adminController.approveLocationRequest);
router.post('/location-requests/:requestId/reject', adminController.rejectLocationRequest);

// Mechanic management routes
router.get('/mechanics', adminController.getAllMechanics);
router.delete('/mechanics/:mechanicId/location', adminController.removeMechanicLocation);
router.delete('/mechanics/:mechanicId', adminController.deleteMechanic);

// User management routes
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);

// Statistics route
router.get('/stats', adminController.getStats);

module.exports = router;