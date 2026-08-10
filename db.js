/**
 * Database entry point. Picks the backend based on whether DATABASE_URL is
 * set:
 *   - Set (Render, once a Postgres instance is linked to this web service):
 *     db.postgres.js. Persists across restarts/spin-downs/deploys.
 *   - Unset (local development): db.sqlite.js, same as before - zero setup,
 *     just works against the pharmacast.db file in the repo.
 *
 * Every other file in the app does `const db = require('./db')` (or '../db')
 * and calls db.run/db.get/db.all/db.exec, or destructures `{ db }` for
 * db.close() - both backends export that exact same shape, so nothing else
 * needed to change to add the Postgres backend.
 */
module.exports = process.env.DATABASE_URL
    ? require('./db.postgres')
    : require('./db.sqlite');
