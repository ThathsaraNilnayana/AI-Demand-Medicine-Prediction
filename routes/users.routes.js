const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const config = require('../config');

const router = express.Router();
const SALT_ROUNDS = 10;
// Single source of truth, shared with routes/auth.routes.js so the value this
// route SETS and the value that route REFUSES to accept as a new password can
// never drift apart.
const DEFAULT_RESET_PASSWORD = config.defaultResetPassword;

// An admin must never be able to lock themselves (or every other admin) out
// of the platform via these account-management actions.
async function countOtherActiveAdmins(excludingUserId) {
    const row = await db.get(
        `SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active' AND user_id != ?`,
        [excludingUserId]
    );
    return row ? row.n : 0;
}

// GET all users (password hash excluded) - unchanged shape, now includes full_name/phone
// Admin-only: this lists every user's email/phone/pharmacy name, so it must not
// be reachable by an unauthenticated caller or a non-admin role.
//
// Optional ?status= filter (FR8): lets the admin dashboard's "Pending
// Approvals" table ask the server for just the pending registrations
// directly, rather than always downloading every user account and
// filtering client-side. Also usable for status=active/rejected/inactive
// if a future view needs those. Omitting ?status entirely preserves the
// original "every user" behaviour exactly, so nothing that already calls
// this endpoint without the param is affected.
const VALID_USER_STATUSES = ['pending', 'active', 'rejected', 'inactive'];
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const { status } = req.query;
        if (status && !VALID_USER_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status filter. Use one of: ${VALID_USER_STATUSES.join(', ')}` });
        }
        const rows = status
            ? await db.all(`
                SELECT user_id, username, email, role, full_name, phone, pharmacy_name, status, created_at, rejection_reason
                FROM users
                WHERE status = ?
                ORDER BY created_at DESC
            `, [status])
            : await db.all(`
                SELECT user_id, username, email, role, full_name, phone, pharmacy_name, status, created_at, rejection_reason
                FROM users
                ORDER BY created_at DESC
            `);
        res.json(rows);
    } catch (err) { next(err); }
});

// ─── Live location sharing ("My Location" dashboard widget) ───
// Self-service, unlike the rest of this file: any authenticated user reads
// or writes their OWN last-known GPS position, not someone else's account,
// so this is intentionally not behind requireRole('admin'). The dashboard
// widget (js/pharmacast-app.js) calls GET on load to restore the last saved
// fix without prompting for a fresh one, then PUT (throttled client-side)
// whenever navigator.geolocation.watchPosition() reports a new position
// while the user has location sharing turned on.
router.get('/location', requireAuth, async (req, res, next) => {
    try {
        const row = await db.get(
            'SELECT latitude, longitude, location_updated_at FROM users WHERE user_id = ?',
            [req.user.id]
        );
        res.json(row && row.latitude != null && row.longitude != null
            ? row
            : { latitude: null, longitude: null, location_updated_at: null });
    } catch (err) { next(err); }
});

router.put('/location',
    requireAuth,
    [
        body('latitude').isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
        body('longitude').isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180')
    ],
    validate,
    async (req, res, next) => {
        try {
            const latitude = Number(req.body.latitude);
            const longitude = Number(req.body.longitude);
            const updatedAt = new Date().toISOString();
            await db.run(
                'UPDATE users SET latitude = ?, longitude = ?, location_updated_at = ? WHERE user_id = ?',
                [latitude, longitude, updatedAt, req.user.id]
            );
            res.json({ latitude, longitude, location_updated_at: updatedAt });
        } catch (err) { next(err); }
    }
);

// Approve a pending registration (FR9)
router.put('/:id/approve', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await db.run(`UPDATE users SET status = 'active' WHERE user_id = ?`, [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User approved successfully' });
    } catch (err) { next(err); }
});

// Reject a pending registration (FR10) - keeps the row for audit, flips status.
// The reason is MANDATORY per FR10 and is persisted so it can be shown to the
// pharmacist when they next attempt to log in.
router.put('/:id/reject', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const reason = (req.body && req.body.reason ? String(req.body.reason) : '').trim();
        if (!reason) {
            return res.status(400).json({ error: 'A rejection reason is required.' });
        }

        const result = await db.run(
            `UPDATE users SET status = 'rejected', rejection_reason = ? WHERE user_id = ?`,
            [reason, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User rejected successfully', reason });
    } catch (err) { next(err); }
});

// Frontend calls DELETE to reject; keep that contract working too.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const reason = (req.body && req.body.reason ? String(req.body.reason) : '').trim();
        if (!reason) {
            return res.status(400).json({ error: 'A rejection reason is required.' });
        }

        const result = await db.run(
            `UPDATE users SET status = 'rejected', rejection_reason = ? WHERE user_id = ?`,
            [reason, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User rejected successfully', reason });
    } catch (err) { next(err); }
});

// Admin creates a brand-new account directly (no approval queue) - e.g. for
// onboarding a pharmacist in person. Reuses the same field rules as
// self-registration so admin-created accounts can't slip in weak passwords.
router.post('/',
    requireAuth, requireRole('admin'),
    [
        body('full_name').trim().matches(/^[A-Za-z.'\- ]{3,50}$/)
            .withMessage("Full name may only contain letters, spaces, periods, apostrophes and hyphens (3-50 chars)"),
        body('email').isEmail().withMessage('Invalid email format'),
        body('username').trim().matches(/^[A-Za-z0-9_]{4,20}$/)
            .withMessage('Username must be 4-20 characters (letters, numbers, underscore)'),
        body('password').isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/)
            .withMessage('Password needs 8+ chars incl. uppercase, lowercase, digit and special character'),
        body('role').isIn(['pharmacist', 'admin']).withMessage('Invalid role')
    ],
    validate,
    async (req, res, next) => {
        try {
            const { username, email, password, role, full_name, phone, pharmacy_name } = req.body;

            const existing = await db.get(
                'SELECT user_id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            if (existing) return res.status(400).json({ error: 'Username or email already registered' });

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const result = await db.run(
                `INSERT INTO users (username, email, password_hash, role, full_name, phone, pharmacy_name, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
                [username, email, passwordHash, role, full_name || null, phone || null, pharmacy_name || null]
            );

            res.json({ user_id: result.lastID, message: 'Account created and activated.' });
        } catch (err) { next(err); }
    }
);

// Deactivate an active account (admin action, distinct from rejecting a
// pending registration). Blocked for your own account and for the last
// remaining active admin, so the platform is never left without an admin.
router.put('/:id/deactivate', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot deactivate your own account.' });
        }

        const user = await db.get('SELECT role, status FROM users WHERE user_id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.role === 'admin' && (await countOtherActiveAdmins(userId)) === 0) {
            return res.status(400).json({ error: 'Cannot deactivate the only remaining active administrator.' });
        }

        await db.run(`UPDATE users SET status = 'inactive' WHERE user_id = ?`, [userId]);
        res.json({ message: 'User deactivated successfully' });
    } catch (err) { next(err); }
});

// Reinstate a previously deactivated (or rejected) account.
router.put('/:id/reactivate', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await db.run(`UPDATE users SET status = 'active' WHERE user_id = ?`, [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User reactivated successfully' });
    } catch (err) { next(err); }
});

// Resets a user's password back to the platform default so they can log in
// and change it themselves. Also clears any lockout so the reset actually
// takes effect immediately.
//
// must_change_password = 1 is the important part: this password is known to
// the admin who issued the reset (and is the same well-known string for every
// reset), so it must never be usable as a working credential. With the flag
// set, /api/login authenticates but issues NO session token - the account is
// forced through /api/change-password before it can reach any page.
router.put('/:id/reset-password', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const passwordHash = await bcrypt.hash(DEFAULT_RESET_PASSWORD, SALT_ROUNDS);
        const result = await db.run(
            `UPDATE users
             SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, must_change_password = 1
             WHERE user_id = ?`,
            [passwordHash, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

        // Any session this user already had must die with the reset - otherwise
        // an already-open tab keeps working on the old credential and simply
        // never sees the forced-change screen.
        await db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);

        res.json({
            message: `Password reset to "${DEFAULT_RESET_PASSWORD}". The user must choose a new password at next login.`,
            default_password: DEFAULT_RESET_PASSWORD,
            must_change_password: true
        });
    } catch (err) { next(err); }
});

// Permanently removes an account's row (distinct from /:id, which only
// soft-rejects a pending registration). Blocked for your own account and
// for the last remaining active admin.
router.delete('/:id/permanent', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }

        const user = await db.get('SELECT role, status FROM users WHERE user_id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.role === 'admin' && user.status === 'active' && (await countOtherActiveAdmins(userId)) === 0) {
            return res.status(400).json({ error: 'Cannot delete the only remaining active administrator.' });
        }

        // sales_data.recorded_by references this user; null it out so the sale
        // history (needed for demand predictions) survives the delete instead
        // of tripping the FK constraint.
        await db.run('UPDATE sales_data SET recorded_by = NULL WHERE recorded_by = ?', [userId]);
        await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM users WHERE user_id = ?', [userId]);
        res.json({ message: 'User permanently deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
