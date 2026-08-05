const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

const db = new sqlite3.Database(config.dbPath, (err) => {
    if (err) console.error('Database error:', err);
    else console.log('✅ Connected to SQLite database');
});

db.run('PRAGMA foreign_keys = ON');

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
    ['users', 'rejection_reason', 'TEXT']
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

module.exports = { db, run, get, all, exec };
