/**
 * One-time migration: copies everything currently in the local pharmacast.db
 * (SQLite) into the Postgres database pointed to by DATABASE_URL.
 *
 * WHY THIS EXISTS: Render's free web services lose their local filesystem
 * every time they spin down from inactivity, so anything written into the
 * SQLite file at runtime - uploaded sales, medicines added through the UI,
 * generated forecasts - was disappearing on the next cold start. Moving to
 * Postgres (see db.postgres.js) fixes that going forward, but doesn't by
 * itself preserve what's already sitting in pharmacast.db right now. This
 * script does that copy, once.
 *
 * Run from the project root, with DATABASE_URL pointing at the target
 * Postgres (Render's "External Database URL" if running this from your own
 * machine rather than from a Render shell):
 *
 *     DATABASE_URL="postgresql://..." node scripts/migrate_sqlite_to_postgres.js
 *
 * Safe to re-run: every table is TRUNCATEd (CASCADE, to also clear
 * dependent rows) immediately before it's repopulated, so re-running this
 * replaces the Postgres data with a fresh copy of pharmacast.db rather than
 * duplicating rows. It does NOT touch pharmacast.db itself - that file is
 * only ever read here, never written.
 *
 * `sessions` is deliberately skipped: those are short-lived login tokens
 * (30-minute idle timeout per config.js), not data worth preserving across
 * a migration - everyone just logs in again.
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'pharmacast.db');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Point it at the target Postgres instance and re-run:');
    console.error('  DATABASE_URL="postgresql://..." node scripts/migrate_sqlite_to_postgres.js');
    process.exit(1);
}

// Deliberately NOT required at module load. Requiring db.postgres immediately
// fires its schema bootstrap (CREATE TABLE IF NOT EXISTS ...), which needs a
// lock on every table - so if a previous run of this script was interrupted
// (closed terminal, lost connection, Ctrl+C), its half-open transaction still
// holds those locks and the require would hang forever with no output. So the
// stale backends get cleared FIRST, then this is required inside main().
let pg;

/**
 * Terminates leftover backends from a previously interrupted run of this
 * script, which would otherwise block the schema bootstrap and the TRUNCATEs
 * below indefinitely.
 *
 * Two kinds of leftover session get cleared, both of which are dead weight:
 *   1. 'idle in transaction' for over a minute - holding locks it will never
 *      release because nothing is driving it any more.
 *   2. Any session currently BLOCKED waiting on a lock. During a migration the
 *      only thing that waits on these tables' locks is another copy of this
 *      script, so a waiter here means a duplicate/abandoned run - and letting
 *      it through would race this one.
 *
 * The live PharmaCast web service is unaffected: its pooled connections sit in
 * plain 'idle' (no open transaction, not waiting on a lock), which matches
 * neither case.
 */
async function clearStaleLocks() {
    const { Client } = require('pg');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
        // Fail fast rather than hanging if the DB is unreachable.
        connectionTimeoutMillis: 15000,
        statement_timeout: 15000
    });
    await client.connect();
    try {
        const { rows } = await client.query(`
            SELECT pg_terminate_backend(pid) AS terminated, pid, state, wait_event_type
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
              AND (
                    (state = 'idle in transaction' AND state_change < now() - interval '1 minute')
                 OR wait_event_type = 'Lock'
              )
        `);
        if (rows.length) {
            console.log(`Cleared ${rows.length} stale connection(s) left by an interrupted run.`);
        }
    } finally {
        await client.end();
    }
}

/** Promisified sqlite3 all() against the local file - read-only, one-shot. */
function sqliteAll(db, sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

/**
 * Copies every row of `table` from the open sqlite `db` into Postgres,
 * inserting explicit values for every column in `columns` (including the
 * primary key, so foreign keys elsewhere - e.g. sales_data.medicine_id -
 * still point at the right row). Then resets the table's SERIAL sequence to
 * MAX(pk) + 1, so the next INSERT that omits the PK (i.e. every normal
 * INSERT the app itself does after migration) continues from the right
 * number instead of colliding with a migrated ID.
 */
async function migrateTable(sqliteDb, table, columns, pkColumn) {
    const rows = await sqliteAll(sqliteDb, `SELECT ${columns.join(', ')} FROM ${table}`);

    await pg.pool.query(`TRUNCATE TABLE ${table} CASCADE`);

    if (rows.length === 0) {
        console.log(`  ${table}: 0 rows (nothing to copy)`);
        return 0;
    }

    // Rows are inserted in batched multi-row INSERTs rather than one query
    // per row. The original one-at-a-time version was correct but pathologically
    // slow in the real deployment: this script runs from a developer's machine
    // against Render's Postgres in Oregon, so every INSERT costs a full network
    // round trip (~250ms). At ~19,000 rows that is over an hour of pure latency.
    // Batching 500 rows per statement turns those ~19,000 round trips into ~40.
    //
    // BATCH_SIZE is bounded by Postgres's hard limit of 65535 bind parameters
    // per statement; the widest table here (users) has 14 columns, so
    // 500 * 14 = 7,000 parameters leaves a large margin.
    const BATCH_SIZE = 500;

    const client = await pg.pool.connect();
    try {
        await client.query('BEGIN');
        for (let start = 0; start < rows.length; start += BATCH_SIZE) {
            const batch = rows.slice(start, start + BATCH_SIZE);
            const values = [];
            const tuples = batch.map((row, rowIdx) => {
                const placeholders = columns.map((c, colIdx) => {
                    values.push(row[c]);
                    return `$${rowIdx * columns.length + colIdx + 1}`;
                });
                return `(${placeholders.join(', ')})`;
            });
            await client.query(
                `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}`,
                values
            );
        }
        if (pkColumn) {
            await client.query(
                `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${pkColumn}) FROM ${table}), 1), (SELECT MAX(${pkColumn}) FROM ${table}) IS NOT NULL)`,
                [table, pkColumn]
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    console.log(`  ${table}: ${rows.length} row(s) copied`);
    return rows.length;
}

async function main() {
    console.log(`Reading from ${DB_PATH}`);
    const sqliteDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) { console.error('Could not open pharmacast.db:', err.message); process.exit(1); }
    });

    console.log('Checking for stale locks from any interrupted previous run...');
    await clearStaleLocks();

    pg = require('../db.postgres');
    await pg.ready;
    console.log('Postgres schema confirmed ready. Migrating (in dependency order)...\n');

    // Order matters: children (sales_data, stock_levels, predictions) carry
    // foreign keys to their parents (users, medicines) and TRUNCATE...CASCADE
    // on a parent would otherwise wipe a child migrated earlier.
    const results = {};
    results.users = await migrateTable(sqliteDb, 'users',
        ['user_id', 'username', 'email', 'password_hash', 'role', 'full_name', 'phone',
         'pharmacy_name', 'status', 'failed_login_attempts', 'locked_until',
         'created_at', 'updated_at', 'rejection_reason'],
        'user_id');

    results.medicines = await migrateTable(sqliteDb, 'medicines',
        ['medicine_id', 'medicine_name', 'generic_name', 'category', 'unit_price',
         'reorder_level', 'current_stock', 'supplier_id', 'created_at',
         'dosage', 'manufacturer', 'created_from_upload'],
        'medicine_id');

    results.sales_data = await migrateTable(sqliteDb, 'sales_data',
        ['sale_id', 'medicine_id', 'quantity_sold', 'sale_date', 'total_amount',
         'recorded_by', 'upload_batch'],
        'sale_id');

    results.stock_levels = await migrateTable(sqliteDb, 'stock_levels',
        ['stock_id', 'medicine_id', 'quantity', 'reorder_level', 'alert_status', 'last_updated'],
        'stock_id');

    results.predictions = await migrateTable(sqliteDb, 'predictions',
        ['prediction_id', 'medicine_id', 'prediction_month', 'predicted_demand',
         'recommended_order_qty', 'confidence_score', 'model_type', 'created_at'],
        'prediction_id');

    console.log('\nMigration complete:', results);
    console.log('(sessions table intentionally skipped - everyone just logs in again)');

    sqliteDb.close();
    await pg.pool.end();
}

main().catch((err) => {
    console.error('\nMigration failed:', err);
    process.exit(1);
});
