// ═══════════════════════════════════════════════════
//  mechanicRoutes.js — أضف هذا لملف الـ routes
// ═══════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { protect }         = require('../middleware/auth');
const mechanicController  = require('../controllers/mechanicController');
const breakdownController = require('../controllers/breakdownController');
const proposalController  = require('../controllers/proposalController');
const reportController    = require('../controllers/Reportcontroller');

router.use(protect('mechanic'));

// Profile
router.get('/profile',            mechanicController.getProfile);
router.put('/profile',            mechanicController.updateProfile);

// Location
router.get('/location',           mechanicController.getLocation);
router.post('/location-requests', mechanicController.createLocationRequest);
router.get('/location-requests',  mechanicController.getLocationRequests);

// Notifications
router.get('/notifications',       mechanicController.getNotifications);
router.post('/notifications/read', mechanicController.markNotificationsRead);

// Reviews
router.get('/reviews', mechanicController.getReviews);

// Breakdowns
router.get('/all-breakdowns', breakdownController.getAllBreakdowns);

// Proposals
router.post('/breakdowns/:breakdownId/proposals', proposalController.submitProposal);
router.get('/my-proposals',                       proposalController.getMyProposals);
router.delete('/proposals/:proposalId',           proposalController.withdrawProposal);

// ── PDF Report Upload ──────────────────────────────────────────────────────
const REPORTS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'reports');

const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    cb(null, REPORTS_DIR);
  },
  filename: (req, file, cb) => {
    const name = `report_${req.user.userId}_${req.params.breakdownId}_${Date.now()}.pdf`;
    cb(null, name);
  },
});

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const uploadPdf = multer({
  storage: reportStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const handlePdfError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'PDF must be under 10MB' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
};

// POST /api/mechanics/breakdowns/:breakdownId/report
router.post(
  '/breakdowns/:breakdownId/report',
  uploadPdf.single('reportPdf'),
  handlePdfError,
  reportController.uploadReport
);

module.exports = router;


// ═══════════════════════════════════════════════════
//  userRoutes.js — أضف هذا السطر
// ═══════════════════════════════════════════════════

// GET /api/users/breakdowns/:breakdownId/report
// router.get('/breakdowns/:breakdownId/report', reportController.getReport);
// (استورد reportController في أعلى الملف)