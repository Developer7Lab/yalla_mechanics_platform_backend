const Breakdown = require('../models/Breakdown');
const Proposal  = require('../models/Proposal');
const path      = require('path');
const fs        = require('fs');

const REPORTS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'reports');

exports.uploadReport = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const mechanicId = req.user.userId;

    const breakdown = await Breakdown.findById(breakdownId);
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    if (breakdown.assignedMechanic?.toString() !== mechanicId) {
      return res.status(403).json({ success: false, error: 'Not authorized — you are not the assigned mechanic' });
    }

    if (breakdown.status !== 'inProgress') {
      return res.status(400).json({ success: false, error: 'Breakdown must be inProgress to submit a report' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDF file is required' });
    }

    if (breakdown.reportPdf?.path) {
      const oldPath = path.join(__dirname, '..', 'public', breakdown.reportPdf.path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const {
      solutionSummary,
      spareParts,
      finalPrice,
    } = req.body;

    let parsedParts = [];
    try { if (spareParts) parsedParts = JSON.parse(spareParts); } catch {}

    breakdown.reportPdf = {
      path:      `/uploads/reports/${req.file.filename}`,
      filename:  req.file.originalname,
      uploadedAt: new Date(),
    };
    breakdown.reportData = {
      solutionSummary: solutionSummary?.trim() || '',
      spareParts:      parsedParts,
      finalPrice:      finalPrice ? Number(finalPrice) : undefined,
      submittedAt:     new Date(),
    };
    breakdown.status = 'resolved';
    await breakdown.save();

    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId:  breakdown.userId,
        message: `الميكانيكي أرسل تقرير الإصلاح لعطلك "${breakdown.title}" — يمكنك تحميله الآن وتقييم الخدمة 📄`,
        type:    'success',
      });
    } catch {}

    res.json({
      success: true,
      message: 'Report uploaded successfully. Breakdown marked as resolved.',
      data: {
        reportPdf:  breakdown.reportPdf,
        reportData: breakdown.reportData,
        status:     breakdown.status,
      },
    });
  } catch (error) {
    console.error('uploadReport error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getReport = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const userId = req.user.userId;

    const breakdown = await Breakdown.findOne({ _id: breakdownId, userId })
      .populate('assignedMechanic', 'fullName username profileData');

    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }
    if (!breakdown.reportPdf?.path) {
      return res.status(404).json({ success: false, error: 'No report uploaded yet' });
    }

    res.json({
      success: true,
      data: {
        reportPdf:       breakdown.reportPdf,
        reportData:      breakdown.reportData,
        assignedMechanic: breakdown.assignedMechanic,
        breakdownTitle:  breakdown.title,
        carInfo:         breakdown.carInfo,
      },
    });
  } catch (error) {
    console.error('getReport error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};