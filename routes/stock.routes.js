const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeAlertStatus } = require('../utils/stockStatus');

const router = express.Router();

// GET all stock levels (FR22)
router.get('/', async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT sl.*, m.medicine_name
            FROM stock_levels sl
            JOIN medicines m ON sl.medicine_id = m.medicine_id
            ORDER BY sl.alert_status DESC
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/:medicineId', async (req, res, next) => {
    try {
        const row = await db.get(`
            SELECT sl.*, m.medicine_name
            FROM stock_levels sl
            JOIN medicines m ON sl.medicine_id = m.medicine_id
            WHERE sl.medicine_id = ?
        `, [req.params.medicineId]);
        if (!row) return res.status(404).json({ error: 'Stock record not found' });
        res.json(row);
    } catch (err) { next(err); }
});

router.put('/:medicineId',
    requireAuth, requireRole('admin', 'pharmacist'),
    [body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')],
    validate,
    async (req, res, next) => {
        try {
            const medicine = await db.get('SELECT reorder_level FROM medicines WHERE medicine_id = ?', [req.params.medicineId]);
            if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

            const { quantity } = req.body;
            // alert_status must always be derived from quantity + reorder_level,
            // never taken from the request body - the classification exists to
            // reflect reality, so trusting a caller-supplied value let any
            // authenticated pharmacist/admin set an alert color that
            // contradicts the actual stock level (e.g. "green" while quantity
            // is 0), silently defeating the low/out-of-stock alerts the
            // Stock Overview and reorder recommendations depend on. The
            // current UI never sends this field, so this only changes
            // behavior for a caller hitting the API directly - it never had a
            // legitimate use.
            const alertStatus = computeAlertStatus(quantity, medicine.reorder_level);

            const result = await db.run(`
                UPDATE stock_levels
                SET quantity = ?, alert_status = ?, last_updated = CURRENT_TIMESTAMP
                WHERE medicine_id = ?
            `, [quantity, alertStatus, req.params.medicineId]);

            if (result.changes === 0) return res.status(404).json({ error: 'Stock record not found' });

            await db.run('UPDATE medicines SET current_stock = ? WHERE medicine_id = ?', [quantity, req.params.medicineId]);

            res.json({ message: 'Stock updated successfully' });
        } catch (err) { next(err); }
    }
);

module.exports = router;
