const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { body } = require('express-validator');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeAlertStatus } = require('../utils/stockStatus');
const { identityKey, parseMedicineLabel, normalizeDosage } = require('../utils/medicineIdentity');

const router = express.Router();

/**
 * Coerces the many shapes a "date" arrives in into YYYY-MM-DD, or null.
 * Handles: real Date objects (XLSX with cellDates), ISO strings, Excel serial
 * numbers, and the dd/mm/yyyy/dd-mm-yyyy formats common in Sri Lankan exports.
 */
function coerceSaleDate(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !isNaN(value)) {
        return value.toISOString().slice(0, 10);
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // Excel serial number (days since 1899-12-30).
    if (/^\d+(\.\d+)?$/.test(raw)) {
        const serial = parseFloat(raw);
        if (serial > 20000 && serial < 80000) {
            const ms = Math.round((serial - 25569) * 86400 * 1000);
            const d = new Date(ms);
            if (!isNaN(d)) return d.toISOString().slice(0, 10);
        }
    }

    // Day-first dates with 2- OR 4-digit years: 22/4/2025, 22/4/25, 22-4-25.
    // The 2-digit form is extremely common in spreadsheet exports; rejecting it
    // was enough to fail an otherwise-valid 7,000-row file, because the import
    // is all-or-nothing (FR27).
    const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (dmy) {
        let [, d, m, y] = dmy;
        let year = +y;
        if (y.length === 2) {
            // Standard windowing: 00-69 -> 2000s, 70-99 -> 1900s.
            year = year <= 69 ? 2000 + year : 1900 + year;
        }
        const dt = new Date(Date.UTC(year, +m - 1, +d));
        if (!isNaN(dt) && dt.getUTCMonth() === +m - 1 && dt.getUTCDate() === +d) {
            return dt.toISOString().slice(0, 10);
        }
    }

    // Year-first with 2-digit day/month: 2025-4-22
    const ymd = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymd) {
        const [, y, m, d] = ymd;
        const dt = new Date(Date.UTC(+y, +m - 1, +d));
        if (!isNaN(dt) && dt.getUTCMonth() === +m - 1) return dt.toISOString().slice(0, 10);
    }

    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);

    return null;
}

// multer needs the destination to exist up front; a missing uploads/ folder
// (it's gitignored, so a fresh clone won't have one) makes every upload fail
// with an opaque ENOENT.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (FR24)
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) return cb(null, true);
        cb(new Error(`Only .csv, .xlsx and .xls files are allowed (you selected "${file.originalname}")`));
    }
});

/**
 * Wraps multer so its failures (file too large, wrong extension) come back as
 * a readable 400 instead of falling through to the generic 500 handler.
 */
function handleUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();
        const tooBig = err.code === 'LIMIT_FILE_SIZE';
        return res.status(400).json({
            error: tooBig
                ? 'File is larger than the 10MB limit.'
                : (err.message || 'Upload failed')
        });
    });
}

/**
 * Training eligibility for EVERY medicine, in one query.
 *
 * The forecasting model needs >= 6 distinct calendar months of sales per
 * medicine. A wide-but-shallow dataset (thousands of products, one or two
 * months each) therefore produces very few trainable series. Without this
 * endpoint the "train everything" button spawns ml/predict.py once per
 * medicine and discovers that the hard way - thousands of Python processes,
 * almost all of which fail with 422. Fetching the counts up front lets the UI
 * train only the medicines that can actually be fitted, and explain the rest.
 *
 * MUST be registered before GET /:medicineId below - Express matches routes
 * in registration order, and /:medicineId matches any single path segment
 * (including literally "trainable"), so this was previously unreachable:
 * every request here was actually being served by
 * `SELECT * FROM sales_data WHERE medicine_id = 'trainable'`, which always
 * returns `[]`. The frontend's "Train Model" flow reads this as
 * `{total_records, eligible_count, medicines}`, so it silently broke on
 * `elig.total_records.toLocaleString()` and fell back to training every
 * medicine unfiltered instead of just the eligible ones.
 */
router.get('/trainable', requireAuth, requireRole('admin', 'pharmacist'), async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT s.medicine_id,
                   m.medicine_name,
                   m.dosage,
                   COUNT(*)                                       AS records,
                   COUNT(DISTINCT strftime('%Y-%m', s.sale_date)) AS months
            FROM sales_data s
            JOIN medicines m ON m.medicine_id = s.medicine_id
            GROUP BY s.medicine_id
            ORDER BY months DESC, m.medicine_name
        `);

        const totalRecords = rows.reduce((sum, r) => sum + r.records, 0);
        const eligible = rows.filter(r => r.months >= 6);

        res.json({
            total_records: totalRecords,
            total_medicines: rows.length,
            eligible_count: eligible.length,
            ineligible_count: rows.length - eligible.length,
            medicines: rows
        });
    } catch (err) { next(err); }
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
router.post('/upload', requireAuth, requireRole('admin', 'pharmacist'), handleUpload, async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const cleanup = () => fs.unlink(req.file.path, () => {});

    try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        let records;

        if (ext === '.csv') {
            const content = fs.readFileSync(req.file.path, 'utf8');
            // bom:true strips the byte-order mark Excel writes when saving as
            // CSV - without it the first header becomes "﻿Date" and never
            // matches, so every row failed with "invalid or missing date".
            records = parse(content, { columns: true, skip_empty_lines: true, trim: true, bom: true });
        } else {
            // cellDates:true makes XLSX hand back real Date objects. Without it
            // dates arrive as Excel serial numbers (e.g. 46204.22), which
            // Date.parse() rejects - so every row of a .xlsx upload failed.
            const workbook = XLSX.readFile(req.file.path, { cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        }

        if (!records.length) {
            cleanup();
            return res.status(400).json({ error: 'File contains no data rows' });
        }

        // Normalize column names (case-insensitive) to Date / Medicine / Quantity.
        // Dosage may be supplied either as its own column OR embedded in the
        // medicine name ("Paracetamol 500mg") - both are handled.
        const normalizeRow = (row) => {
            const out = {};
            for (const key of Object.keys(row)) {
                const k = key.trim().toLowerCase().replace(/[\s_-]/g, '');
                if (['date', 'saledate'].includes(k)) out.date = row[key];
                else if (['medicine', 'medicinename'].includes(k)) out.medicine = row[key];
                else if (['medicineid'].includes(k)) out.medicine_id = row[key];
                else if (['quantity', 'quantitysold', 'qty'].includes(k)) out.quantity = row[key];
                else if (['dosage', 'strength', 'mg'].includes(k)) out.dosage = row[key];
                else if (['category'].includes(k)) out.category = row[key];
                else if (['unitprice', 'price'].includes(k)) out.unit_price = row[key];
                else if (['manufacturer', 'brand'].includes(k)) out.manufacturer = row[key];
            }
            return out;
        };

        // If the required columns are missing entirely, say so once with the
        // headers we actually found - far more useful than N identical
        // "missing date" errors, one per row.
        const detectedKeys = Object.keys(normalizeRow(records[0]));
        const missing = ['date', 'quantity'].filter(k => !detectedKeys.includes(k));
        if (!detectedKeys.includes('medicine') && !detectedKeys.includes('medicine_id')) {
            missing.push('medicine name');
        }
        if (missing.length) {
            cleanup();
            return res.status(400).json({
                error: `Missing required column(s): ${missing.join(', ')}. `
                     + `Columns found in your file: ${Object.keys(records[0]).join(', ')}. `
                     + `Expected headers: Date, Medicine Name, Quantity Sold (optional: Dosage, Category, Manufacturer, Unit Price).`
            });
        }

        // Build the identity index of what's already in the database.
        // The key is (base medicine name + dosage), so a different strength of
        // the same drug is deliberately a DIFFERENT key and will never merge.
        const medicines = await db.all('SELECT medicine_id, medicine_name, dosage FROM medicines');
        const byIdentity = new Map(
            medicines.map(m => [identityKey(m.medicine_name, m.dosage), m.medicine_id])
        );
        const byId = new Set(medicines.map(m => m.medicine_id));

        const validRows = [];
        const errors = [];

        records.forEach((raw, index) => {
            const rowNum = index + 2; // +1 header, +1 for 1-indexing
            const row = normalizeRow(raw);
            const rowErrors = [];

            const saleDate = coerceSaleDate(row.date);
            if (!saleDate) {
                rowErrors.push(row.date
                    ? `unrecognised date "${row.date}" (use YYYY-MM-DD)`
                    : 'missing date');
            }

            const quantity = Number(row.quantity);
            if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
                rowErrors.push('quantity must be a positive integer');
            }

            if (!row.medicine_id && !row.medicine) {
                rowErrors.push('medicine name (or medicine_id) is required');
            }

            if (rowErrors.length) {
                errors.push({ row: rowNum, errors: rowErrors });
                return;
            }

            // An explicit, existing medicine_id always wins. Otherwise resolve
            // by identity so we can merge-or-create below.
            let medicineId = null;
            let identity = null;
            if (row.medicine_id && byId.has(Number(row.medicine_id))) {
                medicineId = Number(row.medicine_id);
            } else {
                identity = identityKey(row.medicine, row.dosage);
            }

            validRows.push({
                medicine_id: medicineId,
                identity,
                raw_name: String(row.medicine || '').trim(),
                dosage: normalizeDosage(row.dosage) || parseMedicineLabel(row.medicine).dosage,
                category: row.category ? String(row.category).trim() : null,
                manufacturer: row.manufacturer ? String(row.manufacturer).trim() : null,
                unit_price: Number.isFinite(Number(row.unit_price)) ? Number(row.unit_price) : null,
                quantity_sold: quantity,
                sale_date: saleDate
            });
        });

        if (errors.length) {
            cleanup();
            return res.status(400).json({
                error: `${errors.length} of ${records.length} rows failed validation`,
                details: errors
            });
        }

        // Guard against importing the same file twice. Re-uploading silently
        // duplicates every row, which quietly corrupts the forecasts (double
        // the recorded demand for the same months). Compare this file's shape
        // against previous batches; if an
        // earlier batch has the same row count and the same date span, assume
        // it is a repeat and require ?force=true to proceed.
        if (!/^(1|true|yes)$/i.test(String(req.query.force || ''))) {
            const dates = validRows.map(r => r.sale_date).sort();
            const priorBatch = await db.get(`
                SELECT upload_batch,
                       COUNT(*) AS records,
                       MIN(sale_date) AS first_date,
                       MAX(sale_date) AS last_date
                FROM sales_data
                WHERE upload_batch IS NOT NULL
                GROUP BY upload_batch
                HAVING records = ? AND first_date = ? AND last_date = ?
                LIMIT 1
            `, [validRows.length, dates[0], dates[dates.length - 1]]);

            if (priorBatch) {
                cleanup();
                return res.status(409).json({
                    error: 'This file looks like one you have already uploaded.',
                    duplicate_of: priorBatch.upload_batch,
                    detail: `An earlier upload already holds ${priorBatch.records} rows spanning `
                          + `${priorBatch.first_date} to ${priorBatch.last_date}. Importing it again would `
                          + `duplicate the sales history and skew the forecasts. `
                          + `Remove the earlier dataset first, or re-send with ?force=true if this really is new data.`,
                    duplicate: true
                });
            }
        }

        // All rows valid: insert as a single transaction (all-or-nothing, FR27).
        // Every row is tagged with the same upload_batch id so this exact
        // upload can be undone in one shot via DELETE /api/sales/batch/:batchId.
        //
        // Merge rule: a row whose (name + dosage) already exists is merged into
        // that medicine's sales history. A row with the SAME name but a
        // DIFFERENT dosage does not match any existing identity, so it is
        // created as its own separate medicine record. Sales history is purely
        // historical data for the forecasting model - it does NOT touch
        // current_stock, which is only ever changed via PUT /api/stock/:id.
        const batchId = crypto.randomUUID();
        let mergedCount = 0;
        let createdCount = 0;
        const createdMedicines = [];

        await db.run('BEGIN TRANSACTION');
        try {
            for (const row of validRows) {
                let medicineId = row.medicine_id;

                if (!medicineId) {
                    medicineId = byIdentity.get(row.identity);

                    if (medicineId) {
                        // Existing product (same name AND same dosage) -> merge.
                        mergedCount++;
                    } else {
                        // New strength / new product -> separate record.
                        const parsed = parseMedicineLabel(row.raw_name);
                        const insertMed = await db.run(`
                            INSERT INTO medicines (medicine_name, generic_name, category, unit_price, reorder_level, current_stock, dosage, manufacturer, created_from_upload)
                            VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1)
                        `, [
                            row.raw_name,
                            parsed.baseName || row.raw_name,
                            row.category || 'Other',
                            row.unit_price != null ? row.unit_price : 0,
                            0,
                            row.dosage,
                            row.manufacturer
                        ]);
                        medicineId = insertMed.lastID;

                        await db.run(`
                            INSERT INTO stock_levels (medicine_id, quantity, reorder_level, alert_status)
                            VALUES (?, 0, 0, ?)
                        `, [medicineId, computeAlertStatus(0, 0)]);

                        byIdentity.set(row.identity, medicineId);
                        byId.add(medicineId);
                        createdCount++;
                        createdMedicines.push({ medicine_id: medicineId, name: row.raw_name, dosage: row.dosage });
                    }
                }

                await db.run(`
                    INSERT INTO sales_data (medicine_id, quantity_sold, sale_date, recorded_by, upload_batch)
                    VALUES (?, ?, ?, ?, ?)
                `, [medicineId, row.quantity_sold, row.sale_date, req.user.id, batchId]);
            }

            await db.run('COMMIT');
        } catch (txErr) {
            await db.run('ROLLBACK');
            throw txErr;
        }

        cleanup();
        res.json({
            message: `${validRows.length} sales records imported successfully `
                + `(${mergedCount} merged into existing medicines, ${createdCount} new medicine record(s) created).`,
            imported: validRows.length,
            merged: mergedCount,
            created: createdCount,
            created_medicines: createdMedicines,
            batchId
        });
    } catch (err) {
        cleanup();
        next(err);
    }
});

// Lists the medicines a given upload touched, so the UI can train the AI
// model on JUST that dataset instead of re-running every medicine in the
// database. Available to whoever may upload (admin or pharmacist).
router.get('/batch/:batchId/medicines', requireAuth, requireRole('admin', 'pharmacist'), async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT s.medicine_id,
                   m.medicine_name,
                   m.dosage,
                   COUNT(*)              AS records,
                   COUNT(DISTINCT strftime('%Y-%m', s.sale_date)) AS months
            FROM sales_data s
            JOIN medicines m ON m.medicine_id = s.medicine_id
            WHERE s.upload_batch = ?
            GROUP BY s.medicine_id
            ORDER BY m.medicine_name
        `, [req.params.batchId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No records found for this upload batch.' });
        }
        res.json(rows);
    } catch (err) { next(err); }
});

// Undo an entire upload in one shot - deletes every sales_data row tagged
// with this batch id. Same roles as the upload itself (admin or pharmacist),
// since either can upload a dataset and should be able to pull it back out.
router.delete('/batch/:batchId', requireAuth, requireRole('admin', 'pharmacist'), async (req, res, next) => {
    try {
        const batchId = req.params.batchId;

        const perMedicine = await db.all(`
            SELECT DISTINCT medicine_id
            FROM sales_data
            WHERE upload_batch = ?
        `, [batchId]);

        if (perMedicine.length === 0) {
            return res.status(404).json({ error: 'No records found for this upload batch (it may already be removed).' });
        }

        let removed = 0;
        await db.run('BEGIN TRANSACTION');
        try {
            const result = await db.run('DELETE FROM sales_data WHERE upload_batch = ?', [batchId]);
            removed = result.changes;

            for (const row of perMedicine) {
                // Cached forecasts were derived from the now-deleted sales, so
                // drop them rather than leaving stale predictions on screen.
                await db.run('DELETE FROM predictions WHERE medicine_id = ?', [row.medicine_id]);
            }

            await db.run('COMMIT');
        } catch (txErr) {
            await db.run('ROLLBACK');
            throw txErr;
        }

        res.json({
            message: `Removed ${removed} sales record(s).`,
            removed
        });
    } catch (err) { next(err); }
});

module.exports = router;
