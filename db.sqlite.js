/**
 * SQLite backend - used for local development (`npm start` with no
 * DATABASE_URL set). Zero setup: just works against the pharmacast.db file
 * already in the repo.
 *
 * NOT used in production on Render: free web services have an ephemeral
 * filesystem, so a local SQLite file there resets to whatever's baked into
 * the last deploy every time the service spins down from inactivity (~15
 * min). See db.postgres.js for the persistent production backend, and
 * db.js for how the two are switched between.
 */
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

const db = new sqlite3.Database(config.dbPath, (err) => {
    if (err) console.error('Database error:', err);
    else console.log('✅ Connected to SQLite database');
});

db.run('PRAGMA foreign_keys = ON');

// Performance pragmas. None of these change query results - they change how
// SQLite talks to disk, which is what actually dominates response time on a
// small VM like Render's free tier:
//   - WAL: readers no longer block behind writers (default rollback-journal
//     mode takes a lock that serializes every read behind any in-flight
//     write; every /api/* request touches this file).
//   - synchronous=NORMAL: safe under WAL (only fsyncs at checkpoints, not
//     every commit) and is the mode SQLite's own docs recommend pairing
//     with WAL. FULL is the slow default meant for rollback-journal mode.
//   - cache_size/mmap_size: keep more of a 2MB database resident instead of
//     re-reading pages from disk on every query.
//   - temp_store=MEMORY: the ORDER BY/GROUP BY temp b-trees used by the
//     stats and prediction queries use RAM instead of a temp file.
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');
db.run('PRAGMA cache_size = -8000'); // ~8MB page cache (negative = KB, not pages)
db.run('PRAGMA temp_store = MEMORY');
db.run('PRAGMA mmap_size = 134217728'); // 128MB

// Indexes the original schema was missing. CREATE INDEX IF NOT EXISTS is
// idempotent, so this is safe to run on every boot against an existing
// database (fresh installs get the same indexes via migrations/setup_database.py).
//   - medicines(medicine_name COLLATE NOCASE): speeds up ORDER BY
//     medicine_name (e.g. the sales-eligibility listing in sales.routes.js).
//     NOTE: it does NOT speed up the search endpoint (GET
//     /api/medicines?search=) - that uses `LIKE '%term%'`, and a leading
//     wildcard can't use a b-tree index at all (confirmed via EXPLAIN QUERY
//     PLAN: it still full-scans). At ~3,000 medicines that scan is a few
//     milliseconds either way, so it isn't worth the complexity of an FTS5
//     virtual table - noted here so nobody "fixes" the search by re-adding
//     an index that provably can't help it.
//   - predictions(medicine_id): looked up on every medicine detail view and
//     rewritten on every forecast regeneration; was previously unindexed.
//     Confirmed via EXPLAIN QUERY PLAN this changes the lookup from a full
//     table scan to an index search.
//   - predictions(prediction_month): GET /api/predictions filters
//     `WHERE prediction_month >= DATE('now')` across the whole table.
//   - users(LOWER(username)) / users(LOWER(email)): /api/login and
//     /api/change-password look the user up with `WHERE LOWER(username) =
//     LOWER(?) OR LOWER(email) = LOWER(?)`. The UNIQUE constraints on
//     username/email already create ordinary indexes, but those can't be
//     used once the column is wrapped in LOWER() - confirmed via EXPLAIN
//     QUERY PLAN, which showed a full table SCAN on users for every single
//     login/logout-triggering login attempt. An index on the LOWER(column)
//     expression itself lets SQLite use a SEARCH instead, which is what
//     keeps login fast as the users table grows past a handful of test rows.
const PERF_INDEXES = [
    `CREATE INDEX IF NOT EXISTS idx_medicines_name_nocase ON medicines(medicine_name COLLATE NOCASE)`,
    `CREATE INDEX IF NOT EXISTS idx_predictions_medicine ON predictions(medicine_id)`,
    `CREATE INDEX IF NOT EXISTS idx_predictions_month ON predictions(prediction_month)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales_data(upload_batch)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username))`,
    `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))`,
];
for (const sql of PERF_INDEXES) {
    db.run(sql, (err) => {
        if (err) console.error('Index creation warning:', err.message);
    });
}

// Lightweight, idempotent migration: tags each bulk-uploaded row with the
// batch it came from, so an admin/pharmacist can undo an entire upload
// (DELETE /api/sales/batch/:batchId) instead of only individual sales rows.
// Existing databases won't have this column yet - add it if missing, and
// ignore the "duplicate column" error on databases that already have it.
// Each entry is applied once; "duplicate column" simply means an existing
// database already has it, so that error is expected and ignored.
const MIGRATIONS = [
    // Tags each bulk-uploaded row with the batch it came from, so an
    // admin/pharmacist can undo an entire upload in one action.
    ['sales_data', 'upload_batch', 'TEXT'],
    // FR21: dosage is part of a medicine's identity - "Paracetamol 500mg" and
    // "Paracetamol 250mg" are DIFFERENT products and must never be merged
    // into one another during a sales upload. manufacturer completes the
    // medicine profile FR21 asks to display.
    ['medicines', 'dosage', 'TEXT'],
    ['medicines', 'manufacturer', 'TEXT'],
    // Marks medicines that were auto-created by a sales-data upload rather
    // than added to the catalogue by an admin. Pharmacists may remove these
    // (cleaning up their own import) but not catalogue entries.
    ['medicines', 'created_from_upload', 'INTEGER DEFAULT 0'],
    // FR10: the rejection reason is mandatory and must be retained so it can
    // be shown to the pharmacist when they next try to log in.
    ['users', 'rejection_reason', 'TEXT'],
    // Training diagnostics (Loss/Accuracy panel): same value written to every
    // forecast-month row for a generation run, mirroring how model_type is
    // already stored. Without these, cached predictions (the common case -
    // most medicines' predictions were generated before this feature existed)
    // have no loss/accuracy/smape to show until re-trained.
    ['predictions', 'backtest_smape', 'REAL'],
    ['predictions', 'loss_mae', 'REAL'],
    ['predictions', 'accuracy_pct', 'REAL'],
    // Set to 1 when an admin resets an account's password to the shared
    // default. While set, login verifies the password but issues no session -
    // the account must go through /api/change-password first, so a known
    // default password can never reach an actual logged-in page.
    ['users', 'must_change_password', 'INTEGER DEFAULT 0'],
    // Last known GPS fix for the dashboard's "My Location" widget (see
    // routes/users.routes.js GET/PUT /api/users/location). NULL until the
    // user opts in and shares their device location at least once - never
    // populated automatically.
    ['users', 'latitude', 'REAL'],
    ['users', 'longitude', 'REAL'],
    ['users', 'location_updated_at', 'TEXT']
];

for (const [table, column, type] of MIGRATIONS) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
        if (err && !/duplicate column/i.test(err.message)) {
            console.error(`Migration warning (${table}.${column}):`, err.message);
        }
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

function exec(sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

/**
 * Runs `fn` inside a BEGIN/COMMIT transaction, rolling back on any thrown
 * error. SQLite only ever has the one connection here, so - unlike the
 * Postgres backend - this doesn't need any connection pinning; it's a thin
 * wrapper purely so route files can use the same `db.transaction(fn)` call
 * against either backend.
 */
async function transaction(fn) {
    await run('BEGIN TRANSACTION');
    try {
        const result = await fn();
        await run('COMMIT');
        return result;
    } catch (err) {
        await run('ROLLBACK');
        throw err;
    }
}

module.exports = { db, run, get, all, exec, transaction };
