const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mechanicController = require('../controllers/mechanicController');

// All routes require authentication and 'mechanic' role
router.use(protect('mechanic'));

// @route   GET /api/mechanics/profile
router.get('/profile', mechanicController.getProfile);

// @route   PUT /api/mechanics/profile
router.put('/profile', mechanicController.updateProfile);

// @route   GET /api/mechanics/location
router.get('/location', mechanicController.getLocation);

// @route   POST /api/mechanics/location-requests
router.post('/location-requests', mechanicController.createLocationRequest);

// @route   GET /api/mechanics/location-requests
router.get('/location-requests', mechanicController.getLocationRequests);

// @route   GET /api/mechanics/notifications
router.get('/notifications', mechanicController.getNotifications);

// @route   POST /api/mechanics/notifications/read
router.post('/notifications/read', mechanicController.markNotificationsRead);

// @route   GET /api/mechanics/reviews
router.get('/reviews', mechanicController.getReviews);

module.exports = router;