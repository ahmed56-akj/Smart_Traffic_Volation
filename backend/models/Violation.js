const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paidAt: { type: Date, default: Date.now },
  method: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Mobile Wallet'],
    required: true
  },
  paidBy: { type: String, required: true },
  reference: { type: String, default: '' },
  receiptNo: { type: String, required: true }
}, { _id: false });

const violationSchema = new mongoose.Schema({
  violationId: {
    type: String,
    unique: true,
    default: () => 'TG-' + Date.now().toString(36).toUpperCase()
  },
  // Vehicle Info
  plate: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: {
    type: String,
    enum: ['Car', 'Motorcycle', 'Truck', 'Bus', 'Van'],
    required: true
  },
  owner: { type: String, default: 'Unknown', trim: true },
  contact: { type: String, default: '', trim: true },

  // Violation Info
  type: {
    type: String,
    enum: [
      'speeding_minor', 'speeding_major', 'red_light', 'no_seatbelt',
      'mobile_use', 'wrong_way', 'illegal_parking', 'no_license',
      'drunk_driving', 'reckless', 'overloading', 'no_helmet'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'critical'],
    default: 'minor'
  },
  location: { type: String, required: true, trim: true },
  officerId: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },

  // Fine Info (auto-calculated)
  baseFine: { type: Number, required: true, min: 0 },
  processingFee: { type: Number, required: true, min: 0 },
  totalFine: { type: Number, required: true, min: 0 },

  // Status
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'disputed'],
    default: 'unpaid'
  },
  payment: { type: paymentSchema, default: null }

}, {
  timestamps: true,  // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for MongoDB Compass queries
violationSchema.index({ plate: 1 });
violationSchema.index({ status: 1 });
violationSchema.index({ type: 1 });
violationSchema.index({ createdAt: -1 });
violationSchema.index({ violationId: 1 }, { unique: true });

// Fine lookup map
const FINE_MAP = {
  speeding_minor: 2000, speeding_major: 5000, red_light: 7500,
  no_seatbelt: 1500, mobile_use: 3000, wrong_way: 6000,
  illegal_parking: 1000, no_license: 10000, drunk_driving: 25000,
  reckless: 15000, overloading: 8000, no_helmet: 1500
};

// Static method to calculate fine
violationSchema.statics.calculateFine = function(type) {
  const base = FINE_MAP[type] || 0;
  const fee = Math.round(base * 0.05);
  return { base, fee, total: base + fee };
};

module.exports = mongoose.model('Violation', violationSchema);
