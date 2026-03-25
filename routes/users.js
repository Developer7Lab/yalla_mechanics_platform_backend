const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { protect }       = require('../middleware/auth');
const userController    = require('../controllers/userController');
const proposalController = require('../controllers/proposalController');


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

router.use(protect('user'));

router.get('/profile',  userController.getProfile);
router.put('/profile',  userController.updateProfile);

router.get('/mechanics',                           userController.getMechanics);
router.get('/mechanics/:mechanicId/reviews',       userController.getMechanicReviews);
router.post('/reviews',                            userController.createReview);
router.get('/my-reviews',                          userController.getMyReviews);


router.post(
  '/breakdowns',
  upload.array('photos', 5),
  handleUploadError,
  userController.createBreakdown
);

router.get('/my-breakdowns', userController.getMyBreakdowns);

router.patch('/breakdowns/:id/status', userController.updateBreakdownStatus);

router.delete('/breakdowns/:id', userController.deleteBreakdown);


router.get(
  '/breakdowns/:breakdownId/proposals',
  proposalController.getBreakdownProposals
);


router.post(
  '/breakdowns/:breakdownId/proposals/:proposalId/accept',
  proposalController.acceptProposal
);

router.post(
  '/breakdowns/:breakdownId/proposals/:proposalId/reject',
  proposalController.rejectProposal
);


router.post(
  '/breakdowns/:breakdownId/complete',
  proposalController.completeBreakdown
);

module.exports = router;