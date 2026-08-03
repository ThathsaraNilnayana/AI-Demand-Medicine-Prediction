const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { body } = require('express-validator');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
    dest: path.join(__dirname, '..', 'uploads'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (FR24)
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) return cb(null, true);
        cb(new Error('Only .csv, .xlsx and .xls files are allowed'));
    }
});

// GET sales history for a medicine (unchanged shape)
router.get('/:medicineId', async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT * FROM sales_data
            WHERE medicine_id = ?
            ORDER BY sale_date DESC
        `, [req.params.medicineId]);
        res.json(rows);
    } catch (err) { next(err); }
});

// Record a single sale (FR11 - admin managed)
router.post('/',
    requireAuth, requireRole('admin'),
    [
        body('medicine_id').isInt().withMessage('medicine_id is required'),
        body('quantity_sold').isInt({ min: 1 }).withMessage('quantity_sold must be a positive integer'),
        body('sale_date').isISO8601().withMessage('sale_date must be YYYY-MM-DD')
    ],
    validate,
    async (req, res, next) => {
        try {
            const { medicine_id, quantity_sold, sale_date, total_amount, recorded_by } = req.body;

            const medicine = await db.get('SELECT medicine_id FROM medicines WHERE medicine_id = ?', [medicine_id]);
            if (!medicine) return res.status(400).json({ error: 'medicine_id does not exist' });

            const result = await db.run(`
                INSERT INTO sales_data (medicine_id, quantity_sold, sale_date, total_amount, recorded_by)
                VALUES (?, ?, ?, ?, ?)
            `, [medicine_id, quantity_sold, sale_date, total_amount || null, recorded_by || req.user.id]);

            res.json({ id: result.lastID, message: 'Sale recorded successfully' });
        } catch (err) { next(err); }
    }
);

// ==================== BULK SALES DATA UPLOAD (FR24-27) ====================
// CSV/XLSX with columns: Date, Medicine Name (or medicine_id), Quantity
// Both Admin and Pharmacist may upload historical sales data; recorded_by
// (req.user.id) tracks who actually submitted each batch either way.
router.post('/upload', requireAuth, requireRole('admin', 'pharmacist'), upload.single('file'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const cleanup = () => fs.unlink(req.file.path, () => {});

    try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        let records;

        if (ext === '.csv') {
            const content = fs.readFileSync(req.file.path, 'utf8');
            records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
        } else {
            const workbook = XLSX.readFile(req.file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        }

        if (!records.length) {
            cleanup();
            return res.status(400).json({ error: 'File contains no data rows' });
        }

        // Normalize column names (case-insensitive) to Date / Medicine / Quantity
        const normalizeRow = (row) => {
            const out = {};
            for (const key of Object.keys(row)) {
                const k = key.trim().toLowerCase().replace(/[\s_-]/g, '');
                if (['date', 'saledate'].includes(k)) out.date = row[key];
                else if (['medicine', 'medicinename'].includes(k)) out.medicine = row[key];
                else if (['medicineid'].includes(k)) out.medicine_id = row[key];
                else if (['quantity', 'quantitysold', 'qty'].includes(k)) out.quantity = row[key];
            }
            return out;
        };

        const medicines = await db.all('SELECT medicine_id, medicine_name FROM medicines');
        const byName = new Map(medicines.map(m => [m.medicine_name.trim().toLowerCase(), m.medicine_id]));
        const byId = new Set(medicines.map(m => m.medicine_id));

        const validRows = [];
        const errors = [];

        records.forEach((raw, index) => {
            const rowNum = index + 2; // +1 header, +1 for 1-indexing
            const row = normalizeRow(raw);
            const rowErrors = [];

            if (!row.date || isNaN(Date.parse(row.date))) {
                rowErrors.push('invalid or missing date');
            }

            let medicineId = null;
            if (row.medicine_id && byId.has(Number(row.medicine_id))) {
                medicineId = Number(row.medicine_id);
            } else if (row.medicine && byName.has(String(row.medicine).trim().toLowerCase())) {
                medicineId = byName.get(String(row.medicine).trim().toLowerCase());
            } else {
                rowErrors.push('medicine not found');
            }

            const quantity = Number(row.quantity);
            if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
                rowErrors.push('quantity must be a positive integer');
            }

            if (rowErrors.length) {
                errors.push({ row: rowNum, errors: rowErrors });
            } else {
                validRows.push({
                    medicine_id: medicineId,
                    quantity_sold: quantity,
                    sale_date: new Date(row.date).toISOString().slice(0, 10)
                });
            }
        });

        if (errors.length) {
            cleanup();
            return res.status(400).json({
                error: `${errors.length} of ${records.length} rows failed validation`,
                details: errors
            });
        }

        // All rows valid: insert as a single transaction (all-or-nothing, FR27)
        await db.run('BEGIN TRANSACTION');
        try {
            for (const row of validRows) {
                await db.run(`
                    INSERT INTO sales_data (medicine_id, quantity_sold, sale_date, recorded_by)
                    VALUES (?, ?, ?, ?)
                `, [row.medicine_id, row.quantity_sold, row.sale_date, req.user.id]);
            }
            await db.run('COMMIT');
        } catch (txErr) {
            await db.run('ROLLBACK');
            throw txErr;
        }

        cleanup();
        res.json({ message: `${validRows.length} sales records imported successfully`, imported: validRows.length });
    } catch (err) {
        cleanup();
        next(err);
    }
});

module.exports = router;
