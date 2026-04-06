const express = require('express');
const router  = express.Router();

const { protect }         = require('../middleware/auth');
const mechanicController  = require('../controllers/mechanicController');
const breakdownController = require('../controllers/breakdownController');
const proposalController  = require('../controllers/proposalController');
const reportController    = require('../controllers/reportController');

// Middleware to protect routes
router.use(protect('mechanic'));

// Profile & Location Routes
router.get('/profile',            mechanicController.getProfile);
router.put('/profile',            mechanicController.updateProfile);
router.get('/location',           mechanicController.getLocation);
router.post('/location-requests', mechanicController.createLocationRequest);
router.get('/location-requests',  mechanicController.getLocationRequests);

// Notifications Routes
router.get('/notifications',       mechanicController.getNotifications);
router.post('/notifications/read', mechanicController.markNotificationsRead);

// Reviews Routes
router.get('/reviews', mechanicController.getReviews);

// Breakdowns Routes
router.get('/all-breakdowns', breakdownController.getAllBreakdowns);

// Proposals Routes
router.post('/breakdowns/:breakdownId/proposals', proposalController.submitProposal);
router.get('/my-proposals',                       proposalController.getMyProposals);
router.delete('/proposals/:proposalId',           proposalController.withdrawProposal);

// Report Route (Now expects JSON body instead of multipart/form-data)
router.post(
  '/breakdowns/:breakdownId/report',
  mechanicController.submitReport
);

module.exports = router;