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
const db = require('../db');
const config = require('../config');
const mlWorkerPool = require('./mlWorkerPool');

/**
 * Runs ml/predict.py against a medicine's monthly sales series.
 * Resolves with the engine's parsed JSON stdout.
 *
 * Backed by a small pool of long-lived `predict.py --serve` processes
 * (services/mlWorkerPool.js) instead of spawning a fresh Python interpreter
 * per call - see that module's header comment for why. The signature and
 * resolved/rejected shape are unchanged from the original one-shot-spawn
 * version, so callers (below, and routes/predictions.routes.js) needed no
 * changes at all.
 */
function runPredictionEngine(monthlySeries, horizon = 12) {
    return mlWorkerPool.runPredictionEngine(monthlySeries, horizon);
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
    const medicine = await db.get('SELECT medicine_id, medicine_name FROM medicines WHERE medicine_id = ?', [medicineId]);
    if (!medicine) return { status: 'not_found' };

    const stockRow = await db.get('SELECT quantity FROM stock_levels WHERE medicine_id = ?', [medicineId]);
    const currentStock = stockRow ? stockRow.quantity : 0;

    try {
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medicine_name: medicine.medicine_name,
                current_stock: currentStock
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (response.status === 404) {
                return {
                    status: 'insufficient_data',
                    months_available: 0,
                    minimum_required: 1,
                    error: err.message || 'Medicine not found in ML model'
                };
            }
            return { status: 'error', error: err.message || `Flask error: ${response.status}` };
        }

        const result = await response.json();

        // Replace this medicine's cached forecast with the fresh one.
        await db.run('DELETE FROM predictions WHERE medicine_id = ?', [medicineId]);

        // forecast_month is returned as "YYYY-MM", database expects full date "YYYY-MM-DD"
        const prediction_month = `${result.forecast_month}-01`;

        const insertResult = await db.run(`
            INSERT INTO predictions (medicine_id, prediction_month, predicted_demand, recommended_order_qty, confidence_score, model_type, backtest_smape, loss_mae, accuracy_pct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [medicineId, prediction_month, result.predicted_demand, result.reorder_quantity, 1.0, 'Custom Flask Model', null, null, null]);

        return {
            status: 'ok',
            model_type: 'Custom Flask Model',
            months_available: 1,
            months_observed: 1,
            backtest_smape: null,
            loss: null,
            accuracy: null,
            predictions: [{
                id: insertResult.lastID,
                month: result.forecast_month,
                predicted_demand: result.predicted_demand,
                recommended_order_qty: result.reorder_quantity,
                confidence_score: 1.0,
                model_type: 'Custom Flask Model'
            }]
        };
    } catch (e) {
        return { status: 'error', error: `Failed to connect to ML model server: ${e.message}` };
    }
}

/**
 * Regenerates cached forecasts for every medicine. Used by the nightly job
 * and by the admin "AI Training Studio" modal.
 *
 * Dispatches with bounded concurrency (config.mlWorkerCount, matching the
 * ML worker pool's size) instead of one-at-a-time. A plain sequential
 * `for...of` here would only ever keep a single pooled Python worker busy -
 * the pool could hold N warm workers and this loop would still hand them
 * requests one by one, wasting the very parallelism the pool exists to
 * provide. This keeps up to `mlWorkerCount` medicines in flight together;
 * db writes (INSERT/DELETE per medicine, inside generatePredictionForMedicine)
 * happen through the existing db module, which already serializes/queues
 * concurrent access, so this doesn't require any new locking here.
 */
async function regenerateAllPredictions(onProgress) {
    const medicines = await db.all('SELECT medicine_id, medicine_name FROM medicines ORDER BY medicine_id');
    const summary = { total: medicines.length, ok: 0, insufficient: 0, failed: 0, details: [] };

    const concurrency = Math.max(1, Number(config.mlWorkerCount) || 1);
    let nextIndex = 0;

    async function worker() {
        while (true) {
            const i = nextIndex++;
            if (i >= medicines.length) return;
            const med = medicines[i];

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
    }

    // Note: summary.details ends up ordered by completion time under
    // concurrency, not by medicine_id like the old sequential loop produced.
    // Nothing reads it order-sensitively (precompute_predictions.js just
    // logs each entry as onProgress fires, and the totals are the same
    // either way) but it's worth knowing if something new starts relying on
    // ordering later.
    await Promise.all(Array.from({ length: Math.min(concurrency, medicines.length) }, () => worker()));

    return summary;
}

module.exports = { runPredictionEngine, generatePredictionForMedicine, regenerateAllPredictions };
