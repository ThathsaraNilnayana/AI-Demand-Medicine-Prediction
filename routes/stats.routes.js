const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const [medicines, stock, lowStock, pendingUsers] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM medicines'),
            db.get('SELECT SUM(quantity) as total FROM stock_levels'),
            db.get(`SELECT COUNT(*) as count FROM stock_levels WHERE alert_status = 'red'`),
            db.get(`SELECT COUNT(*) as count FROM users WHERE status = 'pending'`)
        ]);

        res.json({
            totalMedicines: medicines.count || 0,
            totalStock: stock.total || 0,
            lowStockItems: lowStock.count || 0,
            pendingApprovals: pendingUsers.count || 0
        });
    } catch (err) { next(err); }
});

module.exports = router;
