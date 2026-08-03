const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET predictions for one medicine (unchanged shape)
router.get('/:medicineId', async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT * FROM predictions
            WHERE medicine_id = ?
            ORDER BY prediction_month DESC
        `, [req.params.medicineId]);
        res.json(rows);
    } catch (err) { next(err); }
});

// GET all upcoming predictions (next 3 months) - unchanged shape
router.get('/', async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT p.*, m.medicine_name
            FROM predictions p
            JOIN medicines m ON p.medicine_id = m.medicine_id
            WHERE p.prediction_month >= DATE('now')
            ORDER BY p.prediction_month, p.medicine_id
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// Manually insert a prediction record (unchanged, used by legacy/manual flows)
router.post('/', async (req, res, next) => {
    try {
        const { medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type } = req.body;
        const result = await db.run(`
            INSERT INTO predictions (medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type]);
        res.json({ id: result.lastID, message: 'Prediction added successfully' });
    } catch (err) { next(err); }
});

/**
 * Runs ml/predict.py against a medicine's historical monthly sales
 * (aggregated from sales_data) and returns its parsed JSON stdout.
 */
function runPredictionEngine(monthlySeries) {
    return new Promise((resolve, reject) => {
        const proc = spawn(config.pythonBin, [path.join(__dirname, '..', 'ml', 'predict.py')]);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk; });
        proc.stderr.on('data', (chunk) => { stderr += chunk; });

        proc.on('error', (err) => reject(new Error(`Failed to start Python ML engine: ${err.message}`)));

        proc.on('close', (code) => {
            if (code !== 0 && !stdout) {
                return reject(new Error(`ML engine exited with code ${code}: ${stderr}`));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                reject(new Error(`ML engine returned invalid JSON: ${stdout || stderr}`));
            }
        });

        proc.stdin.write(JSON.stringify({ monthly: monthlySeries, horizon: 12 }));
        proc.stdin.end();
    });
}

// Generate (or regenerate) an AI demand prediction for a medicine (FR28-31)
router.post('/generate/:medicineId', requireAuth, async (req, res, next) => {
    try {
        const medicineId = req.params.medicineId;
        const medicine = await db.get('SELECT medicine_id FROM medicines WHERE medicine_id = ?', [medicineId]);
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

        // Aggregate sales into monthly totals (FR28 data-sufficiency check happens
        // inside predict.py based on months_available).
        const monthlyRows = await db.all(`
            SELECT strftime('%Y-%m', sale_date) as month, SUM(quantity_sold) as quantity
            FROM sales_data
            WHERE medicine_id = ?
            GROUP BY month
            ORDER BY month ASC
        `, [medicineId]);

        if (monthlyRows.length === 0) {
            return res.status(422).json({
                status: 'insufficient_data',
                error: 'No historical sales data available for this medicine'
            });
        }

        const result = await runPredictionEngine(monthlyRows);

        if (result.status === 'error') {
            return res.status(500).json({ error: result.error });
        }
        if (result.status === 'insufficient_data') {
            return res.status(422).json(result);
        }

        const stockRow = await db.get('SELECT quantity FROM stock_levels WHERE medicine_id = ?', [medicineId]);
        const currentStock = stockRow ? stockRow.quantity : 0;

        // Clear old predictions for this medicine before storing the fresh forecast.
        await db.run('DELETE FROM predictions WHERE medicine_id = ?', [medicineId]);

        const inserted = [];
        for (const point of result.forecast) {
            const safetyStock = point.predicted_demand * config.safetyStockFactor;
            const required = point.predicted_demand + safetyStock;
            const recommendedOrderQty = Math.max(0, Math.round(required - currentStock));

            const insertResult = await db.run(`
                INSERT INTO predictions (medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [medicineId, `${point.month}-01`, point.predicted_demand, recommendedOrderQty, point.confidence_score, result.model_type]);

            inserted.push({ id: insertResult.lastID, ...point, recommended_order_qty: recommendedOrderQty, model_type: result.model_type });
        }

        res.json({
            status: 'ok',
            model_type: result.model_type,
            months_available: result.months_available,
            predictions: inserted
        });
    } catch (err) { next(err); }
});

module.exports = router;
