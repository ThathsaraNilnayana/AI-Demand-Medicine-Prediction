/**
 * Express route that calls the Python prediction API and returns
 * the forecast to your frontend. Mount this in your main app:
 *   app.use('/api', require('./forecastRoute'));
 */

const express = require('express');
const router = express.Router();

// URLs of your Python Flask service — set via env vars in production
const PREDICT_API_URL = process.env.PREDICT_API_URL || 'http://localhost:5000/predict';
const RECOMMEND_API_URL = process.env.RECOMMEND_API_URL || 'http://localhost:5000/recommend-stock';

// Replace this with your real DB lookup (e.g. a query against your
// inventory/suppliers tables) — this is just a placeholder shape.
async function getStockAndLeadTime(medicineId) {
  // const row = await db.query('SELECT current_stock, lead_time_days FROM inventory WHERE medicine_id = ?', [medicineId]);
  // return { currentStock: row.current_stock, leadTimeDays: row.lead_time_days };
  throw new Error('getStockAndLeadTime() is not implemented yet');
}

router.post('/demand-forecast', async (req, res) => {
  const { medicineId, steps } = req.body;

  try {
    const response = await fetch(PREDICT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicine_id: medicineId, steps })
    });

    if (!response.ok) {
      throw new Error(`Prediction API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Forecast request failed:', err);
    res.status(500).json({ error: 'Failed to get demand forecast' });
  }
});

router.post('/stock-recommendation', async (req, res) => {
  const { medicineId } = req.body;

  try {
    const { currentStock, leadTimeDays } = await getStockAndLeadTime(medicineId);

    const response = await fetch(RECOMMEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicine_id: medicineId,
        current_stock: currentStock,
        lead_time_days: leadTimeDays
      })
    });

    if (!response.ok) {
      throw new Error(`Recommendation API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Stock recommendation request failed:', err);
    res.status(500).json({ error: 'Failed to get stock recommendation' });
  }
});

module.exports = router;
