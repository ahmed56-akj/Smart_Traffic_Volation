const express = require('express');
const router = express.Router();
const Violation = require('../models/Violation');
const AuditLog = require('../models/AuditLog');

// Helper: log audit
const audit = async (action, detail, color, violationId = null, meta = {}) => {
  await AuditLog.create({ action, detail, color, violationId, metadata: meta });
};

// GET /api/violations — list all with search/filter
router.get('/', async (req, res, next) => {
  try {
    const { search, status, type, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { plate: { $regex: search, $options: 'i' } },
        { violationId: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Violation.countDocuments(query);
    const violations = await Violation.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), data: violations });
  } catch (err) { next(err); }
});

// GET /api/violations/stats — dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const [total, unpaid, paidData, dueData] = await Promise.all([
      Violation.countDocuments(),
      Violation.countDocuments({ status: 'unpaid' }),
      Violation.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalFine' } } }
      ]),
      Violation.aggregate([
        { $match: { status: 'unpaid' } },
        { $group: { _id: null, total: { $sum: '$totalFine' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        unpaid,
        paid: total - unpaid,
        revenue: paidData[0]?.total || 0,
        due: dueData[0]?.total || 0
      }
    });
  } catch (err) { next(err); }
});

// GET /api/violations/reports — analytics
router.get('/reports', async (req, res, next) => {
  try {
    const [byType, byStatus, avgFine, topLocation] = await Promise.all([
      Violation.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, revenue: { $sum: '$totalFine' } } },
        { $sort: { count: -1 } }
      ]),
      Violation.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Violation.aggregate([
        { $group: { _id: null, avg: { $avg: '$totalFine' }, total: { $sum: '$totalFine' } } }
      ]),
      Violation.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({ success: true, data: { byType, byStatus, avgFine: avgFine[0] || {}, topLocation } });
  } catch (err) { next(err); }
});

// GET /api/violations/:id — single violation
router.get('/:id', async (req, res, next) => {
  try {
    const v = await Violation.findOne({
      $or: [{ violationId: req.params.id }, { plate: req.params.id.toUpperCase() }]
    });
    if (!v) return res.status(404).json({ success: false, error: 'Violation not found' });
    res.json({ success: true, data: v });
  } catch (err) { next(err); }
});

// POST /api/violations — create new
router.post('/', async (req, res, next) => {
  try {
    const { plate, vehicleType, owner, contact, type, severity, location, officerId, notes } = req.body;

    const fines = Violation.calculateFine(type);
    const violation = await Violation.create({
      plate, vehicleType, owner, contact, type, severity, location, officerId, notes,
      baseFine: fines.base,
      processingFee: fines.fee,
      totalFine: fines.total
    });

    await audit(
      'VIOLATION RECORDED',
      `${violation.violationId} · ${violation.plate} · ${type} · ₨${fines.total.toLocaleString()}`,
      '#f5c518',
      violation.violationId,
      { plate, type, fine: fines.total }
    );

    res.status(201).json({ success: true, data: violation });
  } catch (err) { next(err); }
});

// PUT /api/violations/:id/pay — process payment
router.put('/:id/pay', async (req, res, next) => {
  try {
    const { method, paidBy, reference } = req.body;
    const v = await Violation.findOne({ violationId: req.params.id });

    if (!v) return res.status(404).json({ success: false, error: 'Violation not found' });
    if (v.status === 'paid') return res.status(400).json({ success: false, error: 'Already paid' });

    const receiptNo = 'RCT-' + Date.now().toString(36).toUpperCase();
    v.status = 'paid';
    v.payment = { method, paidBy, reference: reference || '', receiptNo };
    await v.save();

    await audit(
      'PAYMENT RECEIVED',
      `${v.violationId} · ₨${v.totalFine.toLocaleString()} via ${method} · Receipt: ${receiptNo}`,
      '#22c55e',
      v.violationId,
      { receiptNo, method, amount: v.totalFine }
    );

    res.json({ success: true, data: v, receiptNo });
  } catch (err) { next(err); }
});

// PUT /api/violations/:id/dispute — dispute
router.put('/:id/dispute', async (req, res, next) => {
  try {
    const v = await Violation.findOneAndUpdate(
      { violationId: req.params.id, status: 'unpaid' },
      { status: 'disputed' },
      { new: true }
    );
    if (!v) return res.status(404).json({ success: false, error: 'Violation not found or not unpaid' });

    await audit('DISPUTED', `${v.violationId} · ${v.plate} marked as disputed`, '#f97316', v.violationId);
    res.json({ success: true, data: v });
  } catch (err) { next(err); }
});

// DELETE /api/violations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const v = await Violation.findOneAndDelete({ violationId: req.params.id });
    if (!v) return res.status(404).json({ success: false, error: 'Violation not found' });

    await audit('DELETED', `${req.params.id} · ${v.plate} removed from system`, '#ef4444', req.params.id);
    res.json({ success: true, message: 'Violation deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
