const mongoose = require('mongoose');

const mechanicLocationSchema = new mongoose.Schema({
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  locationData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
mechanicLocationSchema.index({ mechanicId: 1 });

module.exports = mongoose.model('MechanicLocation', mechanicLocationSchema);
