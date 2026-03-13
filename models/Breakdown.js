const mongoose = require('mongoose');

const breakdownSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ── عنوان ووصف المشكلة ──────────────────────────────────────
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  // ── معلومات السيارة ──────────────────────────────────────────
  carInfo: {
    brand: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      min: 1990,
      max: new Date().getFullYear() + 1
    },
    fuelType: {
      type: String,
      enum: ['بنزين', 'ديزل', 'كهربائي', 'هايبرد'],
      required: true
    },
    transmission: {
      type: String,
      enum: ['أوتوماتيك', 'يدوي (عادي)'],
      required: true
    },
    mileage: {
      type: Number,
      min: 0
    }
  },

  // ── تفاصيل المشكلة ──────────────────────────────────────────
  problemDetails: {
    startedAt: {
      type: Date
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    warningLights: {
      type: Boolean,
      default: false
    },
    carRunning: {
      type: Boolean,
      default: true
    }
  },

  // ── الموقع الجغرافي ──────────────────────────────────────────
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },

  // ── صور السيارة / العطل ──────────────────────────────────────
  // كل صورة: { url: string, publicId: string } — جاهز لـ Cloudinary أو أي storage
  photos: [
    {
      url: { type: String, required: true },
      publicId: { type: String, default: '' }
    }
  ],

  // ── حالة المنشور ──────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'inProgress', 'resolved', 'cancelled'],
    default: 'pending'
  },

  // الميكانيكي الذي قبل / يعمل على المشكلة (يُعبأ لاحقاً)
  assignedMechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ── Middleware: تحديث updatedAt تلقائياً ────────────────────────
breakdownSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

breakdownSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ── Indexes ──────────────────────────────────────────────────────
breakdownSchema.index({ userId: 1, createdAt: -1 });
breakdownSchema.index({ status: 1 });
// Geospatial — يمكن ترقيته لـ 2dsphere لاحقاً
breakdownSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Breakdown', breakdownSchema);