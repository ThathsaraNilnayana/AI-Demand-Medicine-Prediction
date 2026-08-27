/**
 * Postgres backend - used in production (DATABASE_URL is set, which Render
 * provides automatically once a Postgres instance is linked to this web
 * service).
 *
 * WHY THIS EXISTS: Render's free web services have an ephemeral filesystem -
 * any local file, including a SQLite database, is wiped every time the
 * service spins down from 15 minutes of inactivity and restarts (confirmed
 * against Render's own docs: "Whenever a service spins down, any changes to
 * its local filesystem are lost"). Every sale uploaded, medicine added, or
 * forecast generated at runtime was disappearing on the next cold start.
 * Postgres lives on its own persistent instance, so it isn't affected by the
 * web service's filesystem lifecycle at all.
 *
 * COMPATIBILITY LAYER: every route file was written against sqlite3's
 * dialect - `?` placeholders, `db.run('BEGIN TRANSACTION')`, `this.lastID`
 * after an INSERT, and a handful of SQLite-only functions (`strftime`,
 * `DATE('now')`, `LIKE ... COLLATE NOCASE`). Rather than hand-edit every
 * query across 8 route files (high risk of a typo silently breaking one),
 * this module translates the exact same query text those files already
 * send, so nothing outside db.js/db.postgres.js/db.sqlite.js had to change:
 *   - `translateDialect()` rewrites the handful of SQLite-only functions to
 *     their Postgres equivalents (see the mapping below - it's a fixed list
 *     because these SQL strings are already known, not a general translator).
 *   - `?` placeholders are converted to Postgres's `$1, $2, ...` positionally.
 *   - INSERTs without an explicit RETURNING clause get one appended, and the
 *     first returned column (every table here defines its primary key
 *     column first) is surfaced as `.lastID`, mirroring sqlite3's `this.lastID`.
 *
 * TRANSACTIONS ARE THE ONE THING THAT ISN'T A DROP-IN TRANSLATION. The
 * original code called `db.run('BEGIN TRANSACTION')`, then several
 * `db.run(...)`, then `db.run('COMMIT')`/`ROLLBACK` as independent
 * statements. Under a connection pool that's unsafe to fake by just
 * intercepting the strings: each `db.run()` can be handed a different
 * physical connection, so BEGIN on connection A does nothing for a query
 * that lands on connection B - the transaction silently isn't atomic (this
 * was caught by a concurrency test here, not guessed: two simultaneous
 * transactions corrupted each other's connection state). So the 3 call sites
 * that used transactions (medicines.routes.js DELETE, sales.routes.js upload
 * + batch-delete) were changed to `db.transaction(async () => { ...await
 * db.run(...); })` - see `transaction()` below, which pins one real client
 * for the whole callback via AsyncLocalStorage.run(), the pattern Node's own
 * docs recommend for exactly this (unlike the more fragile `enterWith`,
 * `run()` gives the callback and everything it awaits a genuinely isolated
 * context, so concurrent transactions from different requests can't bleed
 * into each other).
 */
const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');

// node-postgres returns BIGINT (e.g. COUNT(*)) and NUMERIC columns as
// STRINGS by default, not numbers - it can't safely assume a bigint fits in
// a JS number. That's the right default for a generic driver, but this app's
// route handlers do plain arithmetic on those values (sales.routes.js sums
// `.records` across rows with `sum + r.records`, compares `.months >= 6`,
// predictionService sums quantities), which are all silently wrong on
// strings: `0 + '5'` is the string `'05'`, not the number 5. Every count in
// this app is well within safe-integer range (thousands, not quintillions),
// so parsing them as numbers here - once, for the whole app - is correct and
// far safer than trying to catch every arithmetic call site individually.
types.setTypeParser(20, (val) => parseInt(val, 10));   // BIGINT (COUNT(*), COUNT(DISTINCT ...))
types.setTypeParser(1700, (val) => parseFloat(val));   // NUMERIC/DECIMAL (SUM(), AVG())

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render's internal Postgres URL doesn't need TLS; its external URL
    // does but self-signs, so verification is disabled rather than requiring
    // the user to source a CA bundle for a demo/coursework deployment.
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
        ? { rejectUnauthorized: false }
        : (process.env.PGSSLMODE === 'disable' ? false : undefined),
});

pool.on('error', (err) => {
    // Fired for errors on idle clients in the pool (e.g. the connection was
    // dropped by the server) - without this handler, that's an unhandled
    // 'error' event, which crashes the whole Node process.
    console.error('Unexpected Postgres pool error:', err.message);
});

pool.connect()
    .then((client) => { client.release(); console.log('✅ Connected to Postgres database'); })
    .catch((err) => console.error('Postgres connection error:', err.message));

// ─── Transaction handling ───
// A pool hands out a different physical connection to each query by
// default. That's fine for one-off statements, but a transaction is only
// atomic if every statement inside it runs on the SAME connection - BEGIN on
// connection A does nothing for a query that lands on connection B.
// AsyncLocalStorage scopes a single "sticky" client to the async call chain
// of whichever request is mid-transaction, without route files needing to
// pass a client/connection around explicitly. Each Express request runs in
// its own async chain, so concurrent transactions from different requests
// don't interfere with each other.
const txStorage = new AsyncLocalStorage();

function currentClient() {
    const store = txStorage.getStore();
    return (store && store.client) || pool;
}

// ─── Dialect translation ───
// Fixed, known set of SQLite-only constructs actually used across the route
// files (confirmed by grepping the whole codebase - this is not a general
// SQL translator, it targets exactly what's there):
//   medicines.routes.js   : LIKE ? COLLATE NOCASE
//   predictions.routes.js : DATE('now')
//   recommendations.routes.js : DATE('now', 'start of month')
//   sales.routes.js (x2), predictionService.js : strftime('%Y-%m', col)
function translateDialect(sql) {
    let s = sql;
    s = s.replace(/DATE\(\s*'now'\s*,\s*'start of month'\s*\)/gi, "date_trunc('month', CURRENT_DATE)::date");
    s = s.replace(/DATE\(\s*'now'\s*\)/gi, 'CURRENT_DATE');
    s = s.replace(/strftime\(\s*'%Y-%m'\s*,\s*([a-zA-Z0-9_.]+)\s*\)/gi, "to_char($1, 'YYYY-MM')");
    s = s.replace(/LIKE\s+\?\s+COLLATE\s+NOCASE/gi, 'ILIKE ?');
    return s;
}

function toPositionalParams(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

/** Builds the final Postgres-ready query text: dialect fixes, then `?` -> `$n`. */
function preparePgQuery(sql) {
    return toPositionalParams(translateDialect(sql));
}

async function run(sql, params = []) {
    const client = currentClient();
    const isPlainInsert = /^\s*INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(sql);
    const text = preparePgQuery(sql) + (isPlainInsert ? ' RETURNING *' : '');
    const result = await client.query(text, params);

    let lastID;
    if (isPlainInsert && result.rows[0]) {
        lastID = Object.values(result.rows[0])[0];
    }
    return { lastID, changes: result.rowCount };
}

async function get(sql, params = []) {
    const client = currentClient();
    const result = await client.query(preparePgQuery(sql), params);
    return result.rows[0];
}

async function all(sql, params = []) {
    const client = currentClient();
    const result = await client.query(preparePgQuery(sql), params);
    return result.rows || [];
}

async function exec(sql) {
    const client = currentClient();
    await client.query(sql);
}

function close(callback) {
    pool.end()
        .then(() => callback(null))
        .catch((err) => callback(err));
}

/**
 * Runs `fn` inside a real Postgres transaction: one client, pinned for the
 * duration via AsyncLocalStorage.run() so every db.run/get/all call inside
 * `fn` (including ones nested in loops or helper functions) transparently
 * uses that same client instead of a random one from the pool. Commits on
 * success, rolls back and rethrows on any error, always releases the client.
 */
async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await txStorage.run({ client }, fn);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            // Connection is likely already broken (e.g. the error was itself
            // a connection loss) - the original error is what matters.
        }
        throw err;
    } finally {
        client.release();
    }
}

// ─── Schema bootstrap ───
// Mirrors migrations/setup_database.py, translated to Postgres DDL (SERIAL
// instead of AUTOINCREMENT, REFERENCES instead of a bare FOREIGN KEY comment).
// CREATE TABLE/INDEX IF NOT EXISTS makes this safe to run on every boot -
// a fresh Render Postgres self-initializes with no manual step, and an
// already-migrated one just no-ops.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('pharmacist', 'admin')) NOT NULL,
    full_name TEXT,
    phone TEXT,
    pharmacy_name TEXT,
    status TEXT CHECK(status IN ('active', 'pending', 'inactive', 'rejected')) DEFAULT 'pending',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rejection_reason TEXT
);
-- /api/login and /api/change-password look users up with
-- WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2). The
-- UNIQUE constraints above already give username/email plain btree indexes,
-- but Postgres can't use those once the column is wrapped in LOWER() - it
-- needs an index on that exact expression. Without this every login is a
-- sequential scan of the whole users table.
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

CREATE TABLE IF NOT EXISTS sessions (
    session_token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS medicines (
    medicine_id SERIAL PRIMARY KEY,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT,
    unit_price REAL NOT NULL,
    reorder_level INTEGER,
    current_stock INTEGER DEFAULT 0,
    supplier_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dosage TEXT,
    manufacturer TEXT,
    created_from_upload INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_data (
    sale_id SERIAL PRIMARY KEY,
    medicine_id INTEGER NOT NULL REFERENCES medicines(medicine_id),
    quantity_sold INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    total_amount REAL,
    recorded_by INTEGER REFERENCES users(user_id),
    upload_batch TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_medicine_date ON sales_data(medicine_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales_data(upload_batch);

CREATE TABLE IF NOT EXISTS stock_levels (
    stock_id SERIAL PRIMARY KEY,
    medicine_id INTEGER NOT NULL UNIQUE REFERENCES medicines(medicine_id),
    quantity INTEGER NOT NULL,
    reorder_level INTEGER,
    alert_status TEXT CHECK(alert_status IN ('green', 'yellow', 'red')) DEFAULT 'green',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id SERIAL PRIMARY KEY,
    medicine_id INTEGER NOT NULL REFERENCES medicines(medicine_id),
    prediction_month DATE NOT NULL,
    predicted_demand INTEGER,
    recommended_order_qty INTEGER,
    confidence_score REAL,
    model_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_predictions_medicine ON predictions(medicine_id);
CREATE INDEX IF NOT EXISTS idx_predictions_month ON predictions(prediction_month);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(medicine_name);

-- CREATE TABLE IF NOT EXISTS is a no-op against a table that already exists
-- (i.e. every deployment after the first), so these three columns - added
-- for the Loss/Accuracy training diagnostics - need their own ADD COLUMN
-- IF NOT EXISTS to actually land on the live table. Same value is written
-- to every forecast-month row for a given generation run, mirroring how
-- model_type is already stored (denormalized per row, not a separate table).
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS backtest_smape REAL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS loss_mae REAL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS accuracy_pct REAL;

-- Set to 1 when an admin resets an account's password to the shared default
-- (config.defaultResetPassword). While it is set, /api/login verifies the
-- password but deliberately issues NO session token - the account is forced
-- through /api/change-password first. Stored as INTEGER rather than BOOLEAN
-- so the same 0/1 values round-trip identically through the SQLite driver.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password INTEGER DEFAULT 0;

-- Last known GPS fix for the dashboard's "My Location" widget (see
-- routes/users.routes.js GET/PUT /api/users/location). NULL until the user
-- opts in and shares their device location at least once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
`;

const ready = pool.query(SCHEMA_SQL)
    .then(() => console.log('✅ Postgres schema ready'))
    .catch((err) => console.error('Postgres schema bootstrap failed:', err.message));

module.exports = {
    db: { close },
    run, get, all, exec, transaction,
    // Exposed for scripts/migrate_sqlite_to_postgres.js, which needs to wait
    // for the schema to exist before copying rows into it, and needs the raw
    // pool for OVERRIDING-free explicit-ID inserts + sequence resets.
    ready,
    pool,
};
