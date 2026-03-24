const Breakdown = require('../models/Breakdown');
const Proposal  = require('../models/Proposal');
const path      = require('path');
const fs        = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: حفظ الصور محلياً
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'breakdowns');

const savePhotosLocally = (files = []) => {
  if (!files.length) return [];
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return files.map(file => ({
    url:      `/uploads/breakdowns/${file.filename}`,
    publicId: file.filename,
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

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }
    if (!carInfo.brand || !carInfo.model || !carInfo.fuelType || !carInfo.transmission) {
      return res.status(400).json({ success: false, error: 'Car brand, model, fuelType, and transmission are required' });
    }
    if (location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Location (lat, lng) is required' });
    }

    const photos = savePhotosLocally(req.files || []);

    const breakdown = new Breakdown({
      userId: req.user.userId,
      title:  title.trim(),
      description: description.trim(),
      carInfo: {
        brand:        carInfo.brand,
        model:        carInfo.model,
        year:         carInfo.year        ? Number(carInfo.year)    : undefined,
        fuelType:     carInfo.fuelType,
        transmission: carInfo.transmission,
        mileage:      carInfo.mileage     ? Number(carInfo.mileage) : undefined,
      },
      problemDetails: {
        startedAt:     problemDetails.startedAt ? new Date(problemDetails.startedAt) : undefined,
        isRecurring:   Boolean(problemDetails.isRecurring),
        warningLights: Boolean(problemDetails.warningLights),
        carRunning:    problemDetails.carRunning !== undefined ? Boolean(problemDetails.carRunning) : true,
      },
      location: {
        lat:  Number(location.lat),
        lng:  Number(location.lng),
        note: location.note || '',
      },
      photos,
    });

    await breakdown.save();

    const populated = await Breakdown.findById(breakdown._id)
      .populate('userId', 'fullName username');

    res.status(201).json({
      success: true,
      message: 'Breakdown post created successfully',
      data: populated,
    });
  } catch (error) {
    console.error('createBreakdown error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    منشوراتي (المستخدم يشوف عطوله هو)
//  @route   GET /api/users/my-breakdowns
//  @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyBreakdowns = async (req, res) => {
  try {
    const breakdowns = await Breakdown.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('assignedMechanic', 'fullName username');

    // لكل عطل في حالة pending، احسب عدد الاقتراحات
    const withCounts = await Promise.all(
      breakdowns.map(async bd => {
        const obj = bd.toObject();
        if (bd.status === 'pending') {
          obj.proposalCount = await Proposal.countDocuments({
            breakdownId: bd._id,
            status: 'pending',
          });
        }
        return obj;
      })
    );

    res.json({ success: true, count: withCounts.length, data: withCounts });
  } catch (error) {
    console.error('getMyBreakdowns error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    كل الأعطال للميكانيكيين
//  @route   GET /api/mechanics/all-breakdowns
//  @access  Private (Mechanic)
//
//  ⚠️  الأعطال في حالة inProgress أو resolved لا تظهر للميكانيكيين الآخرين
//      إلا إذا كان هو نفسه المُعيَّن (assignedMechanic)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllBreakdowns = async (req, res) => {
  try {
    const mechanicId               = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    let filter;

    if (status) {
      // فلتر محدد من الميكانيكي
      if (['inProgress', 'resolved'].includes(status)) {
        // يشوف فقط اللي هو مُعيَّن عليها
        filter = { status, assignedMechanic: mechanicId };
      } else {
        filter = { status };
      }
    } else {
      // بدون فلتر: يشوف pending (الكل) + inProgress/resolved (بتاعته فقط)
      filter = {
        $or: [
          { status: 'pending' },
          { status: { $in: ['inProgress', 'resolved'] }, assignedMechanic: mechanicId },
        ],
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [breakdowns, total] = await Promise.all([
      Breakdown.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'fullName username profileData')
        .populate('assignedMechanic', 'fullName username'),
      Breakdown.countDocuments(filter),
    ]);

    // لكل عطل pending: هل قدّم هذا الميكانيكي اقتراحاً مسبقاً؟
    const enriched = await Promise.all(
      breakdowns.map(async bd => {
        const obj = bd.toObject();
        if (bd.status === 'pending') {
          const myProposal = await Proposal.findOne({
            breakdownId: bd._id,
            mechanicId,
          }).select('status price currency createdAt');
          obj.myProposal     = myProposal || null;
          obj.proposalCount  = await Proposal.countDocuments({
            breakdownId: bd._id,
            status: { $in: ['pending', 'accepted'] },
          });
        }
        return obj;
      })
    );

    res.json({
      success: true,
      count: enriched.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  enriched,
    });
  } catch (error) {
    console.error('getAllBreakdowns error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    تحديث حالة المنشور (admin / internal use)
//  @route   PATCH /api/users/breakdowns/:id/status
//  @access  Private
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
    )
      .populate('userId',            'fullName username')
      .populate('assignedMechanic',  'fullName username');

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    res.json({ success: true, message: 'Status updated', data: breakdown });
  } catch (error) {
    console.error('updateBreakdownStatus error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  @desc    حذف منشور عطل
//  @route   DELETE /api/users/breakdowns/:id
//  @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteBreakdown = async (req, res) => {
  try {
    const breakdown = await Breakdown.findOne({
      _id:    req.params.id,
      userId: req.user.userId,
    });

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found or unauthorized' });
    }

    breakdown.photos.forEach(photo => {
      const filePath = path.join(__dirname, '..', 'public', photo.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    // حذف كل الاقتراحات المرتبطة
    await Proposal.deleteMany({ breakdownId: breakdown._id });

    await breakdown.deleteOne();

    res.json({ success: true, message: 'Breakdown deleted successfully' });
  } catch (error) {
    console.error('deleteBreakdown error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};