#!/usr/bin/env node
/**
 * Nightly prediction cache job.
 *
 * Regenerates the 12-month demand forecast + order recommendation for every
 * medicine and stores it in the `predictions` table. Pharmacist-facing pages
 * read from that table, so they render instantly from cache and never wait on
 * live model fitting.
 *
 * Run manually:
 *     npm run precompute
 *
 * Schedule nightly (example: 2:00 AM):
 *
 *   Linux / macOS - `crontab -e`:
 *       0 2 * * * cd /path/to/pharmacast && /usr/bin/node scripts/precompute_predictions.js >> logs/precompute.log 2>&1
 *
 *   Windows - Task Scheduler:
 *       Program:   node
 *       Arguments: scripts\precompute_predictions.js
 *       Start in:  C:\path\to\pharmacast
 *       Trigger:   Daily at 02:00
 *
 * Exit codes: 0 = every medicine either forecast or legitimately skipped for
 * insufficient data; 1 = at least one medicine failed unexpectedly.
 */
const { db } = require('../db');
const { regenerateAllPredictions } = require('../services/predictionService');

function timestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

(async () => {
    const startedAt = Date.now();
    console.log(`[${timestamp()}] PharmaCast prediction cache job starting...`);

    try {
        const summary = await regenerateAllPredictions((entry) => {
            if (entry.status === 'ok') {
                const avgConfidence =
                    entry.predictions.reduce((a, p) => a + (p.confidence_score || 0), 0) /
                    (entry.predictions.length || 1);
                console.log(
                    `  [OK]   ${entry.medicine_name} - ${entry.model_type}, ` +
                    `${entry.months_available} months, confidence ${(avgConfidence * 100).toFixed(1)}%`
                );
            } else if (entry.status === 'insufficient_data') {
                console.log(
                    `  [SKIP] ${entry.medicine_name} - only ${entry.months_available || 0} month(s) of history ` +
                    `(need ${entry.minimum_required || 6})`
                );
            } else {
                console.error(`  [FAIL] ${entry.medicine_name} - ${entry.error || entry.status}`);
            }
        });

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
            `[${timestamp()}] Done in ${seconds}s - ` +
            `${summary.ok} forecast, ${summary.insufficient} skipped (insufficient data), ${summary.failed} failed.`
        );

        db.close(() => process.exit(summary.failed > 0 ? 1 : 0));
    } catch (err) {
        console.error(`[${timestamp()}] Prediction cache job crashed:`, err.message);
        db.close(() => process.exit(1));
    }
})();
