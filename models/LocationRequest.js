const mongoose = require('mongoose');

const locationRequestSchema = new mongoose.Schema({
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  locationData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  }
});

// Index for faster queries
locationRequestSchema.index({ mechanicId: 1, requestedAt: -1 });
locationRequestSchema.index({ status: 1 });

module.exports = mongoose.model('LocationRequest', locationRequestSchema);
