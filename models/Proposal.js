const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
//  Proposal Model
//
//  الميكانيكي يقدم اقتراح على منشور عطل:
//    - السعر المقترح
//    - وصف الخدمة (ماذا سيعمل)
//    - الوقت المتوقع
//    - نوع الخدمة (يجي عند العميل / العميل يجي عنده)
//
//  بعد موافقة المستخدم على اقتراح واحد:
//    - الاقتراح status  → 'accepted'
//    - باقي الاقتراحات → 'rejected'  (تلقائياً)
//    - الـ Breakdown    → assignedMechanic + status: 'inProgress'
// ─────────────────────────────────────────────────────────────────────────────

const proposalSchema = new mongoose.Schema(
  {
    // ── References ─────────────────────────────────────────────
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

    // ── تفاصيل الاقتراح ────────────────────────────────────────
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'JOD', // دينار أردني — غيّر حسب بلدك
      trim: true,
    },
    serviceDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    estimatedTime: {
      // مثلاً: "ساعتين" أو "30 دقيقة"
      type: String,
      trim: true,
      maxlength: 80,
    },
    serviceType: {
      type: String,
      enum: ['onsite', 'workshop'],
      // onsite  = الميكانيكي يجي عند العميل
      // workshop = العميل يجيب السيارة للورشة
      required: true,
    },

    // ── حالة الاقتراح ─────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      // pending   = بانتظار رد المستخدم
      // accepted  = المستخدم وافق
      // rejected  = المستخدم رفض (أو وافق على غيره)
      // withdrawn = الميكانيكي سحب اقتراحه
      default: 'pending',
      index: true,
    },

    // ── ملاحظات إضافية (اختياري) ──────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: 400,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt تلقائياً
  }
);

// ── Compound index: ميكانيكي واحد → اقتراح واحد لكل عطل ────────
proposalSchema.index({ breakdownId: 1, mechanicId: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);