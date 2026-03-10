const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

// All routes require authentication and 'user' role
router.use(protect('user'));

// @route   GET /api/users/profile
router.get('/profile', userController.getProfile);

// @route   PUT /api/users/profile
router.put('/profile', userController.updateProfile);

// @route   GET /api/users/mechanics
router.get('/mechanics', userController.getMechanics);

// @route   GET /api/users/mechanics/:mechanicId/reviews
router.get('/mechanics/:mechanicId/reviews', userController.getMechanicReviews);

// @route   POST /api/users/reviews
router.post('/reviews', userController.createReview);

// @route   GET /api/users/my-reviews
router.get('/my-reviews', userController.getMyReviews);

module.exports = router;