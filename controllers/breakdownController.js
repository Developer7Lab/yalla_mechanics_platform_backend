const Breakdown = require('../models/Breakdown');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: معالجة الصور المرفوعة
//
//  الكود هنا يحفظ الصور محلياً في /public/uploads/breakdowns
//  إذا أردت Cloudinary بدّل savePhotosLocally بـ savePhotosToCloudinary
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'breakdowns');

const savePhotosLocally = (files = []) => {
  if (!files.length) return [];

  // تأكد من وجود المجلد
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  return files.map(file => ({
    url: `/uploads/breakdowns/${file.filename}`,
    publicId: file.filename
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    نشر منشور عطل جديد
//  @route   POST /api/users/breakdowns
//  @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
exports.createBreakdown = async (req, res) => {
  try {
    const { title, description } = req.body;

    // الحقول القادمة كـ JSON strings من FormData
    let carInfo        = {};
    let problemDetails = {};
    let location       = {};

    try {
      if (req.body.carInfo)        carInfo        = JSON.parse(req.body.carInfo);
      if (req.body.problemDetails) problemDetails = JSON.parse(req.body.problemDetails);
      if (req.body.location)       location       = JSON.parse(req.body.location);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON in request fields' });
    }

    // ── Validation ────────────────────────────────────────────
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    if (!carInfo.brand || !carInfo.model || !carInfo.fuelType || !carInfo.transmission) {
      return res.status(400).json({ success: false, error: 'Car brand, model, fuelType, and transmission are required' });
    }

    if (location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Location (lat, lng) is required' });
    }

    // ── معالجة الصور ──────────────────────────────────────────
    const photos = savePhotosLocally(req.files || []);

    // ── إنشاء المنشور ─────────────────────────────────────────
    const breakdown = new Breakdown({
      userId: req.user.userId,
      title:  title.trim(),
      description: description.trim(),
      carInfo: {
        brand:        carInfo.brand,
        model:        carInfo.model,
        year:         carInfo.year ? Number(carInfo.year) : undefined,
        fuelType:     carInfo.fuelType,
        transmission: carInfo.transmission,
        mileage:      carInfo.mileage ? Number(carInfo.mileage) : undefined
      },
      problemDetails: {
        startedAt:     problemDetails.startedAt ? new Date(problemDetails.startedAt) : undefined,
        isRecurring:   Boolean(problemDetails.isRecurring),
        warningLights: Boolean(problemDetails.warningLights),
        carRunning:    problemDetails.carRunning !== undefined ? Boolean(problemDetails.carRunning) : true
      },
      location: {
        lat:  Number(location.lat),
        lng:  Number(location.lng),
        note: location.note || ''
      },
      photos
    });

    await breakdown.save();

    const populated = await Breakdown.findById(breakdown._id)
      .populate('userId', 'fullName username');

    res.status(201).json({
      success: true,
      message: 'Breakdown post created successfully',
      data: populated
    });
  } catch (error) {
    console.error('Error creating breakdown:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    جلب منشورات العطل الخاصة باليوزر
//  @route   GET /api/users/my-breakdowns
//  @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyBreakdowns = async (req, res) => {
  try {
    const breakdowns = await Breakdown.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('assignedMechanic', 'fullName username');

    res.json({
      success: true,
      count: breakdowns.length,
      data: breakdowns
    });
  } catch (error) {
    console.error('Error fetching breakdowns:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    جلب كل منشورات العطل (للميكانيكيين) — سيُستخدم في mechanic routes
//  @route   GET /api/mechanics/breakdowns
//  @access  Private (Mechanic)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllBreakdowns = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [breakdowns, total] = await Promise.all([
      Breakdown.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'fullName username profileData'),
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
    console.error('Error fetching all breakdowns:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    تحديث حالة المنشور (مثلاً ميكانيكي يقبل أو يحل المشكلة)
//  @route   PATCH /api/users/breakdowns/:id/status
//  @access  Private (User أو Mechanic — حسب منطق تطبيقك)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateBreakdownStatus = async (req, res) => {
  try {
    const { status, assignedMechanic } = req.body;

    const allowed = ['pending', 'inProgress', 'resolved', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const updateData = { status };
    if (assignedMechanic) updateData.assignedMechanic = assignedMechanic;

    const breakdown = await Breakdown.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'fullName username')
     .populate('assignedMechanic', 'fullName username');

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown post not found' });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: breakdown
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    حذف منشور عطل (باليوزر نفسه فقط)
//  @route   DELETE /api/users/breakdowns/:id
//  @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteBreakdown = async (req, res) => {
  try {
    const breakdown = await Breakdown.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown post not found or unauthorized' });
    }

    // حذف الصور المحلية إذا وُجدت
    breakdown.photos.forEach(photo => {
      const filePath = path.join(__dirname, '..', 'public', photo.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await breakdown.deleteOne();

    res.json({ success: true, message: 'Breakdown post deleted successfully' });
  } catch (error) {
    console.error('Error deleting breakdown:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};