const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { protect }       = require('../middleware/auth');
const userController    = require('../controllers/userController');
const proposalController = require('../controllers/proposalController');

// ─────────────────────────────────────────────────────────────────────────────
//  Multer — حفظ صور العطل محلياً
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'breakdowns');
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `bd_${req.user.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ success: false, error: 'File size must be under 5MB' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: 'Maximum 5 photos allowed' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
};

// All routes require authentication + 'user' role
router.use(protect('user'));

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile',  userController.getProfile);
router.put('/profile',  userController.updateProfile);

// ── Mechanics & Reviews ───────────────────────────────────────────────────────
router.get('/mechanics',                           userController.getMechanics);
router.get('/mechanics/:mechanicId/reviews',       userController.getMechanicReviews);
router.post('/reviews',                            userController.createReview);
router.get('/my-reviews',                          userController.getMyReviews);

// ── Breakdowns ────────────────────────────────────────────────────────────────
// POST   /api/users/breakdowns              — نشر عطل جديد
router.post(
  '/breakdowns',
  upload.array('photos', 5),
  handleUploadError,
  userController.createBreakdown
);

// GET    /api/users/my-breakdowns           — عطولي + عدد الاقتراحات
router.get('/my-breakdowns', userController.getMyBreakdowns);

// PATCH  /api/users/breakdowns/:id/status   — تحديث الحالة يدوياً
router.patch('/breakdowns/:id/status', userController.updateBreakdownStatus);

// DELETE /api/users/breakdowns/:id          — حذف عطل
router.delete('/breakdowns/:id', userController.deleteBreakdown);

// ── Proposals (user side) ────────────────────────────────────────────────────
// GET    /api/users/breakdowns/:breakdownId/proposals
//        المستخدم يشوف كل الاقتراحات على عطله
router.get(
  '/breakdowns/:breakdownId/proposals',
  proposalController.getBreakdownProposals
);

// POST   /api/users/breakdowns/:breakdownId/proposals/:proposalId/accept
//        المستخدم يوافق على اقتراح → يُعيَّن الميكانيكي تلقائياً
router.post(
  '/breakdowns/:breakdownId/proposals/:proposalId/accept',
  proposalController.acceptProposal
);

// POST   /api/users/breakdowns/:breakdownId/proposals/:proposalId/reject
//        المستخدم يرفض اقتراح معين
router.post(
  '/breakdowns/:breakdownId/proposals/:proposalId/reject',
  proposalController.rejectProposal
);

// POST   /api/users/breakdowns/:breakdownId/complete
//        المستخدم يعلن اكتمال الخدمة → status: 'resolved'
router.post(
  '/breakdowns/:breakdownId/complete',
  proposalController.completeBreakdown
);

module.exports = router;