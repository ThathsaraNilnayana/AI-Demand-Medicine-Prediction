/**
 * Shared demand-prediction service.
 *
 * Extracted so the HTTP route (POST /api/predictions/generate/:id) and the
 * nightly cache job (scripts/precompute_predictions.js) run the exact same
 * code path, rather than duplicating the ML invocation + storage logic.
 *
 * Predictions are written into the `predictions` table, which is what the
 * pharmacist-facing pages read from - i.e. that table IS the cache, and the
 * nightly job is what keeps it warm so those pages never wait on model fitting.
 */
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db');
const config = require('../config');

/**
 * Runs ml/predict.py against a medicine's monthly sales series.
 * Resolves with the engine's parsed JSON stdout.
 */
function runPredictionEngine(monthlySeries, horizon = 12) {
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

        proc.stdin.write(JSON.stringify({ monthly: monthlySeries, horizon }));
        proc.stdin.end();
    });
}

/**
 * Generates and stores a 12-month forecast + order recommendations for one medicine.
 *
 * Returns one of:
 *   { status: 'not_found' }
 *   { status: 'insufficient_data', months_available, minimum_required }
 *   { status: 'error', error }
 *   { status: 'ok', model_type, months_available, predictions: [...] }
 */
async function generatePredictionForMedicine(medicineId) {
    const medicine = await db.get('SELECT medicine_id FROM medicines WHERE medicine_id = ?', [medicineId]);
    if (!medicine) return { status: 'not_found' };

    // Aggregate raw sales rows into monthly totals (the ML engine's expected input).
    const monthlyRows = await db.all(`
        SELECT strftime('%Y-%m', sale_date) as month, SUM(quantity_sold) as quantity
        FROM sales_data
        WHERE medicine_id = ?
        GROUP BY month
        ORDER BY month ASC
    `, [medicineId]);

    if (monthlyRows.length === 0) {
        return {
            status: 'insufficient_data',
            months_available: 0,
            minimum_required: 6,
            error: 'No historical sales data available for this medicine'
        };
    }

    const result = await runPredictionEngine(monthlyRows, 12);

    if (result.status === 'error') return { status: 'error', error: result.error };
    if (result.status === 'insufficient_data') return { ...result, status: 'insufficient_data' };

    const stockRow = await db.get('SELECT quantity FROM stock_levels WHERE medicine_id = ?', [medicineId]);
    const currentStock = stockRow ? stockRow.quantity : 0;

    // Replace this medicine's cached forecast with the fresh one.
    await db.run('DELETE FROM predictions WHERE medicine_id = ?', [medicineId]);

    const inserted = [];
    for (const point of result.forecast) {
        // Safety_Stock = Predicted_Demand * factor
        // Recommended_Order = MAX(0, Predicted_Demand + Safety_Stock - Current_Stock)
        const safetyStock = point.predicted_demand * config.safetyStockFactor;
        const required = point.predicted_demand + safetyStock;
        const recommendedOrderQty = Math.max(0, Math.round(required - currentStock));

        const insertResult = await db.run(`
            INSERT INTO predictions (medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [medicineId, `${point.month}-01`, point.predicted_demand, recommendedOrderQty, point.confidence_score, result.model_type]);

        inserted.push({
            id: insertResult.lastID,
            ...point,
            recommended_order_qty: recommendedOrderQty,
            model_type: result.model_type
        });
    }

    return {
        status: 'ok',
        model_type: result.model_type,
        months_available: result.months_available,
        predictions: inserted
    };
}

/** Regenerates cached forecasts for every medicine. Used by the nightly job. */
async function regenerateAllPredictions(onProgress) {
    const medicines = await db.all('SELECT medicine_id, medicine_name FROM medicines ORDER BY medicine_id');
    const summary = { total: medicines.length, ok: 0, insufficient: 0, failed: 0, details: [] };

    for (const med of medicines) {
        let outcome;
        try {
            outcome = await generatePredictionForMedicine(med.medicine_id);
        } catch (err) {
            outcome = { status: 'error', error: err.message };
        }

        if (outcome.status === 'ok') summary.ok++;
        else if (outcome.status === 'insufficient_data') summary.insufficient++;
        else summary.failed++;

        const entry = { medicine_id: med.medicine_id, medicine_name: med.medicine_name, ...outcome };
        summary.details.push(entry);
        if (typeof onProgress === 'function') onProgress(entry);
    }

    return summary;
}

module.exports = { runPredictionEngine, generatePredictionForMedicine, regenerateAllPredictions };
