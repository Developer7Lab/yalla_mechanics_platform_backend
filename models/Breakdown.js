// ─────────────────────────────────────────────────────────────────────────────
//  أضف هذه الحقول لـ breakdownSchema في Breakdown.js
//  بعد حقل assignedMechanic مباشرة:
// ─────────────────────────────────────────────────────────────────────────────

/*
  // ── تقرير الإصلاح (PDF) ──────────────────────────────────
  reportPdf: {
    path:       { type: String, default: null },   // /uploads/reports/filename.pdf
    filename:   { type: String, default: null },   // الاسم الأصلي
    uploadedAt: { type: Date,   default: null },
  },

  reportData: {
    solutionSummary: { type: String, trim: true, default: '' },
    spareParts: [
      {
        name:     { type: String, trim: true },
        quantity: { type: Number, default: 1 },
        price:    { type: Number, default: 0 },
      }
    ],
    finalPrice:  { type: Number, default: null },
    submittedAt: { type: Date,   default: null },
  },
*/

// ─────────────────────────────────────────────────────────────────────────────
//  الـ Breakdown.js الكامل مع الحقول الجديدة
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const breakdownSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title:       { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },

  carInfo: {
    brand:        { type: String, required: true, trim: true },
    model:        { type: String, required: true, trim: true },
    year:         { type: Number, min: 1990, max: new Date().getFullYear() + 1 },
    fuelType:     { type: String, enum: ['بنزين', 'ديزل', 'كهربائي', 'هايبرد'], required: true },
    transmission: { type: String, enum: ['أوتوماتيك', 'يدوي (عادي)'], required: true },
    mileage:      { type: Number, min: 0 },
  },

  problemDetails: {
    startedAt:     { type: Date },
    isRecurring:   { type: Boolean, default: false },
    warningLights: { type: Boolean, default: false },
    carRunning:    { type: Boolean, default: true },
  },

  location: {
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 200 },
  },

  photos: [{ url: { type: String, required: true }, publicId: { type: String, default: '' } }],

  status: {
    type: String,
    enum: ['pending', 'inProgress', 'resolved', 'cancelled'],
    default: 'pending',
    index: true,
  },

  assignedMechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── تقرير الإصلاح ─────────────────────────────────────────
  reportPdf: {
    path:       { type: String, default: null },
    filename:   { type: String, default: null },
    uploadedAt: { type: Date,   default: null },
  },

  reportData: {
    solutionSummary: { type: String, trim: true, default: '' },
    spareParts: [{
      name:     { type: String, trim: true },
      quantity: { type: Number, default: 1  },
      price:    { type: Number, default: 0  },
    }],
    finalPrice:  { type: Number, default: null },
    submittedAt: { type: Date,   default: null },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

breakdownSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
breakdownSchema.pre('findOneAndUpdate', function(next) { this.set({ updatedAt: new Date() }); next(); });

breakdownSchema.index({ userId: 1, createdAt: -1 });
breakdownSchema.index({ status: 1 });
breakdownSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Breakdown', breakdownSchema);