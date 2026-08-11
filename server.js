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
// The HTML shells must never be served from cache without checking first -
// they are what point at the current asset versions.
const sendHtml = (file) => (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, file));
};
app.get('/', sendHtml('index.html'));
app.get('/index.html', sendHtml('index.html'));
app.get('/admin.html', sendHtml('admin.html'));

// This used to be `{ maxAge: '1d', etag: true }`, with a comment claiming
// express.static "still revalidates on" the ETag. It does not. A fresh
// max-age means the browser serves its cached copy WITHOUT asking the server
// anything at all - the ETag is only consulted once max-age has expired. So
// every deploy of pharmacast-app.js / pharmacast-luxury.css was invisible to
// anyone who had loaded the site in the previous 24 hours, which is exactly
// what made a string of correctly-deployed fixes look like they had never
// been applied. (Measured on production: the plain URL returned a 166,088-byte
// build with none of the new code, while the same URL with a cache-buster
// returned the current 171,231-byte build.)
//
// `no-cache` does NOT mean "don't cache" - it means "cache, but revalidate
// before every use". Combined with etag, an unchanged file costs a 304 with
// an empty body, so the bandwidth saving is kept while correctness is
// restored: a deploy is picked up on the next page load, every time.
const staticOpts = {
    etag: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
};
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
