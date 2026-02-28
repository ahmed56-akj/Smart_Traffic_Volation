const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  detail: { type: String, required: true },
  color: { type: String, default: '#6b7280' },
  violationId: { type: String, default: null },
  performedBy: { type: String, default: 'System' },
  ipAddress: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ violationId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
