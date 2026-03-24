const Proposal  = require('../models/Proposal');
const Breakdown = require('../models/Breakdown');

const notifyUser = async (userId, message, type = 'info') => {
  try {
    const Notification = require('../models/Notification');
    await Notification.create({ userId, message, type });
  } catch {
  }
};

exports.submitProposal = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const mechanicId = req.user.userId;

    const breakdown = await Breakdown.findById(breakdownId);
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }
    if (breakdown.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This breakdown is no longer accepting proposals',
      });
    }

    const existing = await Proposal.findOne({ breakdownId, mechanicId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a proposal for this breakdown',
      });
    }

    const { price, serviceDescription, serviceType, estimatedTime, notes, currency } = req.body;

    if (!price || price < 0) {
      return res.status(400).json({ success: false, error: 'Valid price is required' });
    }
    if (!serviceDescription || serviceDescription.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Service description is required (min 5 chars)' });
    }
    if (!['onsite', 'workshop'].includes(serviceType)) {
      return res.status(400).json({ success: false, error: 'serviceType must be "onsite" or "workshop"' });
    }

    const proposal = await Proposal.create({
      breakdownId,
      mechanicId,
      price: Number(price),
      currency: currency || 'JOD',
      serviceDescription: serviceDescription.trim(),
      serviceType,
      estimatedTime: estimatedTime?.trim() || '',
      notes: notes?.trim() || '',
    });

    const populated = await proposal.populate('mechanicId', 'fullName username profileData');

    await notifyUser(
      breakdown.userId,
      `قدّم ميكانيكي اقتراحاً جديداً على عطلك "${breakdown.title}"`,
      'info'
    );

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a proposal for this breakdown',
      });
    }
    console.error('submitProposal error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.withdrawProposal = async (req, res) => {
  try {
    const mechanicId = req.user.userId;

    const proposal = await Proposal.findOne({
      _id: req.params.proposalId,
      mechanicId,
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    if (proposal.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw an accepted proposal',
      });
    }

    proposal.status = 'withdrawn';
    await proposal.save();

    res.json({ success: true, message: 'Proposal withdrawn successfully' });
  } catch (error) {
    console.error('withdrawProposal error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getMyProposals = async (req, res) => {
  try {
    const mechanicId = req.user.userId;
    const { status } = req.query;

    const filter = { mechanicId };
    if (status) filter.status = status;

    const proposals = await Proposal.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: 'breakdownId',
        select: 'title description carInfo status location createdAt userId',
        populate: { path: 'userId', select: 'fullName username' },
      });

    res.json({
      success: true,
      count: proposals.length,
      data: proposals,
    });
  } catch (error) {
    console.error('getMyProposals error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getBreakdownProposals = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const userId = req.user.userId;

    const breakdown = await Breakdown.findOne({ _id: breakdownId, userId });
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    const proposals = await Proposal.find({
      breakdownId,
      status: { $in: ['pending', 'accepted'] },
    })
      .sort({ createdAt: 1 })
      .populate('mechanicId', 'fullName username profileData');

    res.json({
      success: true,
      count: proposals.length,
      data: proposals,
    });
  } catch (error) {
    console.error('getBreakdownProposals error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.acceptProposal = async (req, res) => {
  try {
    const { breakdownId, proposalId } = req.params;
    const userId = req.user.userId;

    const breakdown = await Breakdown.findOne({ _id: breakdownId, userId });
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }
    if (breakdown.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This breakdown has already been assigned or closed',
      });
    }

    const proposal = await Proposal.findOne({
      _id: proposalId,
      breakdownId,
      status: 'pending',
    });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found or already processed' });
    }

    proposal.status = 'accepted';
    await proposal.save();

    await Proposal.updateMany(
      {
        breakdownId,
        _id: { $ne: proposalId },
        status: 'pending',
      },
      { status: 'rejected' }
    );

    breakdown.status           = 'inProgress';
    breakdown.assignedMechanic = proposal.mechanicId;
    await breakdown.save();

    await notifyUser(
      proposal.mechanicId,
      `تمت الموافقة على اقتراحك لعطل "${breakdown.title}" 🎉`,
      'success'
    );

    const populated = await proposal.populate('mechanicId', 'fullName username profileData');

    res.json({
      success: true,
      message: 'Proposal accepted. Mechanic has been assigned.',
      data: {
        proposal: populated,
        breakdown: {
          _id:               breakdown._id,
          status:            breakdown.status,
          assignedMechanic:  breakdown.assignedMechanic,
        },
      },
    });
  } catch (error) {
    console.error('acceptProposal error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.rejectProposal = async (req, res) => {
  try {
    const { breakdownId, proposalId } = req.params;
    const userId = req.user.userId;

    const breakdown = await Breakdown.findOne({ _id: breakdownId, userId });
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }

    const proposal = await Proposal.findOne({
      _id: proposalId,
      breakdownId,
      status: 'pending',
    });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found or already processed' });
    }

    proposal.status = 'rejected';
    await proposal.save();

    res.json({ success: true, message: 'Proposal rejected' });
  } catch (error) {
    console.error('rejectProposal error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.completeBreakdown = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const userId = req.user.userId;

    const breakdown = await Breakdown.findOne({ _id: breakdownId, userId });
    if (!breakdown) {
      return res.status(404).json({ success: false, error: 'Breakdown not found' });
    }
    if (breakdown.status !== 'inProgress') {
      return res.status(400).json({
        success: false,
        error: 'Breakdown must be inProgress to mark as complete',
      });
    }

    breakdown.status = 'resolved';
    await breakdown.save();

    if (breakdown.assignedMechanic) {
      await notifyUser(
        breakdown.assignedMechanic,
        `أعلن العميل عن اكتمال خدمة عطل "${breakdown.title}" ✅`,
        'success'
      );
    }

    res.json({ success: true, message: 'Breakdown marked as resolved' });
  } catch (error) {
    console.error('completeBreakdown error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};