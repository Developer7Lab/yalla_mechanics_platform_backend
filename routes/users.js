const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

// ─────────────────────────────────────────────────────────────────────────────
//  Multer — حفظ صور العطل محلياً
//  الصور تُرفع إلى: /public/uploads/breakdowns/
//
//  لاستخدام Cloudinary بدلاً من الحفظ المحلي:
//  1. npm install multer-storage-cloudinary cloudinary
//  2. استبدل diskStorage بـ CloudinaryStorage
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'breakdowns');
    // المجلد يُنشأ تلقائياً في breakdownController لكن multer يحتاجه موجوداً
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `bd_${req.user.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5                    // max 5 photos
  }
});

// Multer error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ success: false, error: 'File size must be under 5MB' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: 'Maximum 5 photos allowed' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
//  All routes require authentication + 'user' role
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect('user'));

// ── Profile ──────────────────────────────────────────────────────────────────
// @route   GET  /api/users/profile
router.get('/profile', userController.getProfile);

// @route   PUT  /api/users/profile
router.put('/profile', userController.updateProfile);

// ── Mechanics & Reviews ──────────────────────────────────────────────────────
// @route   GET  /api/users/mechanics
router.get('/mechanics', userController.getMechanics);

// @route   GET  /api/users/mechanics/:mechanicId/reviews
router.get('/mechanics/:mechanicId/reviews', userController.getMechanicReviews);

// @route   POST /api/users/reviews
router.post('/reviews', userController.createReview);

// @route   GET  /api/users/my-reviews
router.get('/my-reviews', userController.getMyReviews);

// ── Breakdowns ───────────────────────────────────────────────────────────────
// @route   POST   /api/users/breakdowns          — نشر عطل جديد (مع صور)
router.post(
  '/breakdowns',
  upload.array('photos', 5),
  handleUploadError,
  userController.createBreakdown
);

// @route   GET    /api/users/my-breakdowns        — منشوراتي
router.get('/my-breakdowns', userController.getMyBreakdowns);

// @route   PATCH  /api/users/breakdowns/:id/status — تحديث الحالة
router.patch('/breakdowns/:id/status', userController.updateBreakdownStatus);

// @route   DELETE /api/users/breakdowns/:id        — حذف المنشور
router.delete('/breakdowns/:id', userController.deleteBreakdown);

module.exports = router;