const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const [medicines, stock, lowStock, outOfStock, pendingUsers, totalUsers, salesRecords] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM medicines'),
            db.get('SELECT SUM(quantity) as total FROM stock_levels'),
            db.get(`SELECT COUNT(*) as count FROM stock_levels WHERE alert_status = 'yellow'`),
            db.get(`SELECT COUNT(*) as count FROM stock_levels WHERE alert_status = 'red'`),
            db.get(`SELECT COUNT(*) as count FROM users WHERE status = 'pending'`),
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM sales_data')
        ]);

        res.json({
            totalMedicines: medicines.count || 0,
            totalStock: stock.total || 0,
            lowStockItems: lowStock.count || 0,
            outOfStockItems: outOfStock.count || 0,
            pendingApprovals: pendingUsers.count || 0,
            totalUsers: totalUsers.count || 0,
            totalSalesRecords: salesRecords.count || 0
        });
    } catch (err) { next(err); }
});

module.exports = router;
