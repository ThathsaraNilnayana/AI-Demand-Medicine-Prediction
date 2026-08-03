const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generatePredictionForMedicine } = require('../services/predictionService');

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

// Generate (or regenerate) an AI demand prediction for a medicine (FR28-31).
// Delegates to the shared service so this and the nightly cache job
// (scripts/precompute_predictions.js) always behave identically.
router.post('/generate/:medicineId', requireAuth, async (req, res, next) => {
    try {
        const result = await generatePredictionForMedicine(req.params.medicineId);

        if (result.status === 'not_found') return res.status(404).json({ error: 'Medicine not found' });
        if (result.status === 'insufficient_data') return res.status(422).json(result);
        if (result.status === 'error') return res.status(500).json({ error: result.error });

        res.json(result);
    } catch (err) { next(err); }
});

module.exports = router;
