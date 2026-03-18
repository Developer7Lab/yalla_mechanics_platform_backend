const express = require('express');
const router  = express.Router();
const { protect }         = require('../middleware/auth');
const mechanicController  = require('../controllers/mechanicController');
const breakdownController = require('../controllers/breakdownController');
const proposalController  = require('../controllers/proposalController');

// All routes require authentication + 'mechanic' role
router.use(protect('mechanic'));

// ── Profile ───────────────────────────────────────────────────────────────────
// GET  /api/mechanics/profile
router.get('/profile', mechanicController.getProfile);
// PUT  /api/mechanics/profile
router.put('/profile', mechanicController.updateProfile);

// ── Location ──────────────────────────────────────────────────────────────────
// GET  /api/mechanics/location
router.get('/location', mechanicController.getLocation);
// POST /api/mechanics/location-requests
router.post('/location-requests', mechanicController.createLocationRequest);
// GET  /api/mechanics/location-requests
router.get('/location-requests', mechanicController.getLocationRequests);

// ── Notifications ─────────────────────────────────────────────────────────────
// GET  /api/mechanics/notifications
router.get('/notifications', mechanicController.getNotifications);
// POST /api/mechanics/notifications/read
router.post('/notifications/read', mechanicController.markNotificationsRead);

// ── Reviews ───────────────────────────────────────────────────────────────────
// GET  /api/mechanics/reviews
router.get('/reviews', mechanicController.getReviews);

// ── Breakdowns ────────────────────────────────────────────────────────────────
// GET  /api/mechanics/all-breakdowns
//      يرجع:
//        - كل الـ pending (للجميع)
//        - inProgress / resolved (للميكانيكي المُعيَّن فقط)
//        + حقل myProposal لكل عطل pending (هل قدّم اقتراحاً مسبقاً؟)
router.get('/all-breakdowns', breakdownController.getAllBreakdowns);

// ── Proposals (mechanic side) ─────────────────────────────────────────────────
// POST   /api/mechanics/breakdowns/:breakdownId/proposals
//        الميكانيكي يقدم اقتراح
router.post('/breakdowns/:breakdownId/proposals', proposalController.submitProposal);

// GET    /api/mechanics/my-proposals?status=pending|accepted|rejected|withdrawn
//        الميكانيكي يشوف اقتراحاته
router.get('/my-proposals', proposalController.getMyProposals);

// DELETE /api/mechanics/proposals/:proposalId
//        الميكانيكي يسحب اقتراحه
router.delete('/proposals/:proposalId', proposalController.withdrawProposal);

module.exports = router;