const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// GET /api/audit
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments();
    res.json({ success: true, total, data: logs });
  } catch (err) { next(err); }
});

// DELETE /api/audit — clear all logs
router.delete('/', async (req, res, next) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ success: true, message: 'Audit log cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
