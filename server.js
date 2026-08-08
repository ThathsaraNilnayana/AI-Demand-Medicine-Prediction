const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const config = require('./config');
const { db } = require('./db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const medicinesRoutes = require('./routes/medicines.routes');
const stockRoutes = require('./routes/stock.routes');
const salesRoutes = require('./routes/sales.routes');
const predictionsRoutes = require('./routes/predictions.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const usersRoutes = require('./routes/users.routes');
const statsRoutes = require('./routes/stats.routes');

const app = express();

app.use(cors());
// gzip/brotli-negotiated compression for every response this server sends.
// The medicines list alone is ~2,969 rows of JSON; compression typically
// shrinks that 70-80% before it goes over the wire, which matters more than
// anything server-side on Render's free tier (shared, bandwidth-limited).
app.use(compression());
app.use(express.json());

// SECURITY: only expose what the frontend actually needs (the two HTML
// pages plus css/js). The old `express.static(path.join(__dirname, '.'))`
// served the ENTIRE project root - meaning .env, .git, pharmacast.db (the
// whole database, including password hashes), db.js, config.js and every
// route/service file were all directly downloadable over HTTP. Do not widen
// this without checking what's being exposed.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
// maxAge caches css/js in the browser so navigating between pages re-fetches
// the two HTML shells but not their assets. Safe because deploys change the
// file's Last-Modified/ETag, which express.static still revalidates on.
const staticOpts = { maxAge: '1d', etag: true };
app.use('/css', express.static(path.join(__dirname, 'css'), staticOpts));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOpts));

// Request log for every API call - method, path, status and the error body
// when one is returned. This is what makes "the upload doesn't work" a
// diagnosable problem instead of a guess: server-log.txt shows whether the
// request arrived at all, and exactly why it was rejected.
app.use('/api', (req, res, next) => {
    const started = Date.now();
    const chunks = [];
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        chunks.push(body);
        return originalJson(body);
    };
    res.on('finish', () => {
        const ms = Date.now() - started;
        let detail = '';
        if (res.statusCode >= 400 && chunks.length) {
            try { detail = ' :: ' + JSON.stringify(chunks[0]).slice(0, 400); } catch (e) { /* ignore */ }
        }
        console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)${detail}`);
    });
    next();
});

app.use('/api', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
    console.log(`\n🚀 PharmaCast API Server running on http://localhost:${config.port}`);
    console.log(`📍 Database: pharmacast.db`);
    console.log(`\n📚 Available endpoints:`);
    console.log(`   POST /api/register`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/logout`);
    console.log(`   GET  /api/session`);
    console.log(`   GET    /api/medicines?search=`);
    console.log(`   POST   /api/medicines`);
    console.log(`   PUT    /api/medicines/:id`);
    console.log(`   DELETE /api/medicines/:id`);
    console.log(`   GET  /api/stock`);
    console.log(`   PUT  /api/stock/:medicineId`);
    console.log(`   GET  /api/sales/:medicineId`);
    console.log(`   POST /api/sales`);
    console.log(`   POST /api/sales/upload  (multipart 'file' field, admin or pharmacist)`);
    console.log(`   GET  /api/predictions[/:medicineId]`);
    console.log(`   POST /api/predictions/generate/:medicineId  (runs ML engine)`);
    console.log(`   GET  /api/recommendations/:medicineId`);
    console.log(`   GET  /api/users`);
    console.log(`   PUT  /api/users/:id/approve`);
    console.log(`   PUT  /api/users/:id/reject`);
    console.log(`   DELETE /api/users/:id  (reject)`);
    console.log(`   GET  /api/stats\n`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err);
        console.log('\n✅ Database connection closed');
        process.exit(0);
    });
});
