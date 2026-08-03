const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all users (password hash excluded) - unchanged shape, now includes full_name/phone
router.get('/', async (req, res, next) => {
    try {
        const rows = await db.all(`
            SELECT user_id, username, email, role, full_name, phone, pharmacy_name, status, created_at
            FROM users
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// Approve a pending registration (FR9)
router.put('/:id/approve', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await db.run(`UPDATE users SET status = 'active' WHERE user_id = ?`, [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User approved successfully' });
    } catch (err) { next(err); }
});

// Reject a pending registration (FR10) - keeps the row for audit, flips status
router.put('/:id/reject', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await db.run(`UPDATE users SET status = 'rejected' WHERE user_id = ?`, [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User rejected successfully', reason: reason || null });
    } catch (err) { next(err); }
});

// Frontend calls DELETE to reject; keep that contract working too.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await db.run(`UPDATE users SET status = 'rejected' WHERE user_id = ?`, [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User rejected successfully' });
    } catch (err) { next(err); }
});

module.exports = router;
