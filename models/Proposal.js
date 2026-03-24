const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    breakdownId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Breakdown',
      required: true,
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'JOD',
      trim: true,
    },
    serviceDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    estimatedTime: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    serviceType: {
      type: String,
      enum: ['onsite', 'workshop'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 400,
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.index({ breakdownId: 1, mechanicId: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);