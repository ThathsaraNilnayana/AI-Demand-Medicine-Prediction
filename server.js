const express = require('express');
const cors = require('cors');
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
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

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
    console.log(`   POST /api/sales/upload  (multipart 'file' field, admin only)`);
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
