const express = require('express');
const db = require('../db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET stock recommendation for a medicine (FR34-35 / SDS 5.2.3)
// safety_stock = predicted_demand * factor
// required     = predicted_demand + safety_stock
// recommended  = max(0, required - current_stock)
router.get('/:medicineId', requireAuth, async (req, res, next) => {
    try {
        const medicineId = req.params.medicineId;

        const medicine = await db.get('SELECT medicine_id, medicine_name, unit_price FROM medicines WHERE medicine_id = ?', [medicineId]);
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

        const latestPrediction = await db.get(`
            SELECT * FROM predictions
            WHERE medicine_id = ? AND prediction_month >= DATE('now', 'start of month')
            ORDER BY prediction_month ASC
            LIMIT 1
        `, [medicineId]);

        if (!latestPrediction) {
            return res.status(422).json({
                error: 'No demand prediction available for this medicine yet. Generate one first via POST /api/predictions/generate/:medicineId'
            });
        }

        const stockRow = await db.get('SELECT quantity FROM stock_levels WHERE medicine_id = ?', [medicineId]);
        const currentStock = stockRow ? stockRow.quantity : 0;

        const predictedDemand = latestPrediction.predicted_demand;
        const safetyStock = Math.round(predictedDemand * config.safetyStockFactor);
        const requiredQuantity = predictedDemand + safetyStock;
        const recommendedOrder = Math.max(0, requiredQuantity - currentStock);
        const stockGap = requiredQuantity - currentStock;
        const estimatedCost = Math.round(recommendedOrder * medicine.unit_price * 100) / 100;

        res.json({
            medicine_id: medicine.medicine_id,
            medicine_name: medicine.medicine_name,
            prediction_month: latestPrediction.prediction_month,
            predicted_demand: predictedDemand,
            safety_stock: safetyStock,
            required_quantity: requiredQuantity,
            current_stock: currentStock,
            stock_gap: stockGap,
            recommended_order_qty: recommendedOrder,
            estimated_cost: estimatedCost,
            confidence_score: latestPrediction.confidence_score,
            model_type: latestPrediction.model_type
        });
    } catch (err) { next(err); }
});

module.exports = router;
