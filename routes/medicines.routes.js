const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeAlertStatus } = require('../utils/stockStatus');
const { identityKey, parseMedicineLabel, normalizeDosage } = require('../utils/medicineIdentity');

const router = express.Router();

const medicineValidators = [
    body('medicine_name').trim().notEmpty().withMessage('Medicine name is required'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('reorder_level').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
    body('current_stock').optional().isInt({ min: 0 }).withMessage('Current stock must be a non-negative integer')
];

// GET all medicines, with optional case-insensitive partial-name search (FR20)
// Response shape unchanged: array of rows with .stock/.alert_status joined in.
router.get('/', async (req, res, next) => {
    try {
        const { search } = req.query;
        let rows;
        if (search && search.trim()) {
            rows = await db.all(`
                SELECT m.*, sl.quantity as stock, sl.alert_status
                FROM medicines m
                LEFT JOIN stock_levels sl ON m.medicine_id = sl.medicine_id
                WHERE m.medicine_name LIKE ? COLLATE NOCASE
                LIMIT 50
            `, [`%${search.trim()}%`]);
        } else {
            rows = await db.all(`
                SELECT m.*, sl.quantity as stock, sl.alert_status
                FROM medicines m
                LEFT JOIN stock_levels sl ON m.medicine_id = sl.medicine_id
            `);
        }
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const row = await db.get(`
            SELECT m.*, sl.quantity as stock, sl.alert_status
            FROM medicines m
            LEFT JOIN stock_levels sl ON m.medicine_id = sl.medicine_id
            WHERE m.medicine_id = ?
        `, [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Medicine not found' });
        res.json(row);
    } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), medicineValidators, validate, async (req, res, next) => {
    try {
        const { medicine_name, generic_name, category, unit_price, reorder_level, current_stock, manufacturer } = req.body;
        // Dosage is part of a medicine's identity - accept it explicitly, or
        // fall back to whatever is embedded in the name ("Paracetamol 500mg").
        const dosage = normalizeDosage(req.body.dosage) || parseMedicineLabel(medicine_name).dosage;

        // Reject an exact duplicate (same base name AND same dosage); a
        // different dosage is a genuinely different product and is allowed.
        const existingMeds = await db.all('SELECT medicine_id, medicine_name, dosage FROM medicines');
        const newKey = identityKey(medicine_name, dosage);
        const clash = existingMeds.find(m => identityKey(m.medicine_name, m.dosage) === newKey);
        if (clash) {
            return res.status(400).json({
                error: `"${medicine_name}"${dosage ? ` (${dosage})` : ''} already exists as medicine #${clash.medicine_id}. `
                     + `Use a different dosage to store it as a separate record, or edit the existing one.`
            });
        }

        const result = await db.run(`
            INSERT INTO medicines (medicine_name, generic_name, category, unit_price, reorder_level, current_stock, dosage, manufacturer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [medicine_name, generic_name, category, unit_price, reorder_level || 0, current_stock || 0, dosage, manufacturer || null]);

        const qty = current_stock || 0;
        const reorder = reorder_level || 0;
        await db.run(`
            INSERT INTO stock_levels (medicine_id, quantity, reorder_level, alert_status)
            VALUES (?, ?, ?, ?)
        `, [result.lastID, qty, reorder, computeAlertStatus(qty, reorder)]);

        res.json({ id: result.lastID, message: 'Medicine added successfully' });
    } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('admin'), medicineValidators, validate, async (req, res, next) => {
    try {
        const existing = await db.get('SELECT * FROM medicines WHERE medicine_id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Medicine not found' });

        // reorder_level/current_stock are optional per the validator - a
        // request that omits them keeps the existing value instead of wiping
        // it out with NULL.
        const medicine_name = req.body.medicine_name;
        const generic_name = req.body.generic_name;
        const category = req.body.category;
        const unit_price = req.body.unit_price;
        const manufacturer = req.body.manufacturer;
        const reorder_level = req.body.reorder_level !== undefined ? req.body.reorder_level : existing.reorder_level;
        const current_stock = req.body.current_stock !== undefined ? req.body.current_stock : existing.current_stock;
        const dosage = normalizeDosage(req.body.dosage) || parseMedicineLabel(medicine_name).dosage;

        // Same duplicate-identity guard as creation: don't let an edit collide
        // with a different existing medicine's (name + dosage).
        const others = await db.all(
            'SELECT medicine_id, medicine_name, dosage FROM medicines WHERE medicine_id != ?',
            [req.params.id]
        );
        const newKey = identityKey(medicine_name, dosage);
        const clash = others.find(m => identityKey(m.medicine_name, m.dosage) === newKey);
        if (clash) {
            return res.status(400).json({
                error: `"${medicine_name}"${dosage ? ` (${dosage})` : ''} already exists as medicine #${clash.medicine_id}. `
                     + `Use a different dosage to store it as a separate record, or edit the existing one.`
            });
        }

        await db.run(`
            UPDATE medicines
            SET medicine_name=?, generic_name=?, category=?, unit_price=?, reorder_level=?, current_stock=?, dosage=?, manufacturer=?
            WHERE medicine_id = ?
        `, [medicine_name, generic_name, category, unit_price, reorder_level, current_stock, dosage, manufacturer || null, req.params.id]);

        const status = computeAlertStatus(current_stock, reorder_level);
        await db.run(`
            UPDATE stock_levels SET quantity = ?, reorder_level = ?, alert_status = ?, last_updated = CURRENT_TIMESTAMP
            WHERE medicine_id = ?
        `, [current_stock, reorder_level, status, req.params.id]);

        res.json({ message: 'Medicine updated successfully' });
    } catch (err) { next(err); }
});

/**
 * Removes a medicine and everything that references it.
 *
 * sales_data, stock_levels and predictions all carry a FK to medicines, so a
 * bare DELETE fails with "FOREIGN KEY constraint failed". The children must be
 * cleared first, inside one transaction so a partial delete can't be left behind.
 *
 * Both admins and pharmacists may remove any medicine - a pharmacist manages
 * their own branch inventory, so restricting them to only upload-created rows
 * left them unable to clean up catalogue entries they no longer stock.
 * The confirmation prompt in the UI is what guards against accidental deletes.
 */
router.delete('/:id', requireAuth, requireRole('admin', 'pharmacist'), async (req, res, next) => {
    try {
        const medicineId = req.params.id;

        const medicine = await db.get(
            'SELECT medicine_id, medicine_name, created_from_upload FROM medicines WHERE medicine_id = ?',
            [medicineId]
        );
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

        let removedSales = 0;
        await db.run('BEGIN TRANSACTION');
        try {
            const salesResult = await db.run('DELETE FROM sales_data WHERE medicine_id = ?', [medicineId]);
            removedSales = salesResult.changes;
            await db.run('DELETE FROM predictions WHERE medicine_id = ?', [medicineId]);
            await db.run('DELETE FROM stock_levels WHERE medicine_id = ?', [medicineId]);
            await db.run('DELETE FROM medicines WHERE medicine_id = ?', [medicineId]);
            await db.run('COMMIT');
        } catch (txErr) {
            await db.run('ROLLBACK');
            throw txErr;
        }

        res.json({
            message: `"${medicine.medicine_name}" removed`
                + (removedSales ? ` along with ${removedSales} sales record(s).` : '.'),
            removed_sales: removedSales
        });
    } catch (err) { next(err); }
});

module.exports = router;
