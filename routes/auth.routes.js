const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const { validate } = require('../middleware/validate');
const { createSession, destroySession, requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// ==================== REGISTER (FR1-7) ====================
router.post('/register',
    [
        body('full_name').trim().matches(/^[A-Za-z.'\- ]{3,50}$/)
            .withMessage("Full name may only contain letters, spaces, periods, apostrophes and hyphens (3-50 chars)")
            .custom((v) => v.trim().split(/\s+/).length >= 2)
            .withMessage('Full name must contain at least 2 words'),
        body('email').isEmail().withMessage('Invalid email format'),
        // Accept common phone formats (spaces, dashes, parentheses, leading +)
        // by stripping punctuation before checking digit count, so "+1 (555) 000-0000"
        // validates the same as "15550000000".
        body('phone').optional({ checkFalsy: true })
            .customSanitizer((v) => String(v).replace(/[^0-9]/g, ''))
            .isLength({ min: 10, max: 15 })
            .withMessage('Contact number must have 10-15 digits'),
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

            if (password.toLowerCase().includes(username.toLowerCase())) {
                return res.status(400).json({ error: 'Password must not contain the username' });
            }

            const existing = await db.get(
                'SELECT user_id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            if (existing) {
                return res.status(400).json({ error: 'Username or email already registered' });
            }

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const result = await db.run(
                `INSERT INTO users (username, email, password_hash, role, full_name, phone, pharmacy_name, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [username, email, passwordHash, role, full_name || null, phone || null, pharmacy_name || null]
            );

            res.json({ id: result.lastID, message: 'Registration successful. Awaiting admin approval.' });
        } catch (err) { next(err); }
    }
);

// ==================== LOGIN (FR12-16) ====================
router.post('/login',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validate,
    async (req, res, next) => {
        try {
            const { username, password } = req.body;

            const user = await db.get(
                `SELECT user_id, username, email, password_hash, role, full_name, phone, pharmacy_name, status,
                        failed_login_attempts, locked_until, rejection_reason, must_change_password
                 FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
                [username, username]
            );

            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return res.status(423).json({
                    error: `Account locked until ${user.locked_until} due to repeated failed login attempts`
                });
            }

            const passwordMatches = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatches) {
                const attempts = (user.failed_login_attempts || 0) + 1;
                let lockedUntil = null;
                if (attempts >= config.loginMaxAttempts) {
                    lockedUntil = new Date(Date.now() + config.loginLockoutMinutes * 60 * 1000).toISOString();
                }
                await db.run(
                    'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?',
                    [lockedUntil ? 0 : attempts, lockedUntil, user.user_id]
                );
                if (lockedUntil) {
                    return res.status(423).json({ error: 'Account locked for 30 minutes after 5 failed attempts' });
                }
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Password is correct, but a correct password doesn't mean the
            // account is allowed in yet - pending/rejected/deactivated
            // accounts must not receive a session.
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'Your registration is still awaiting administrator approval.' });
            }
            if (user.status === 'rejected') {
                // FR10: show the pharmacist WHY they were rejected.
                return res.status(403).json({
                    error: user.rejection_reason
                        ? `Your registration was rejected by an administrator. Reason: ${user.rejection_reason}`
                        : 'Your registration was rejected by an administrator.',
                    rejection_reason: user.rejection_reason || null
                });
            }
            if (user.status === 'inactive') {
                return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
            }

            // The credential is valid, so clear the failed-attempt counter
            // either way - this is a successful authentication even if it
            // isn't (yet) a successful login. Skip the write entirely for the
            // (overwhelmingly common) case where there was nothing to clear -
            // most logins never fail first, so this saves a DB round trip on
            // most logins instead of writing the same 0/NULL back every time.
            if (user.failed_login_attempts || user.locked_until) {
                await db.run(
                    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?',
                    [user.user_id]
                );
            }

            // An admin reset this account to the shared default password. That
            // password is known to whoever issued the reset and is identical
            // across every reset, so it must not be usable as a working
            // credential. Deliberately return BEFORE createSession(): no token
            // is minted, so there is no session for the client to "skip ahead"
            // with even if it ignores this response and calls another endpoint.
            // The account can only proceed via POST /api/change-password below,
            // which re-verifies this same password before issuing a session.
            if (Number(user.must_change_password) === 1) {
                return res.json({
                    must_change_password: true,
                    username: user.username,
                    name: user.full_name || user.username,
                    message: 'Your password was reset by an administrator. Please choose a new password to continue.'
                });
            }

            const { token } = await createSession(user.user_id, user.role);

            // Response shape kept backward-compatible with the existing frontend
            // (it reads user.status/user.role/user.name directly); token is additive.
            res.json({
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.full_name || user.username,
                full_name: user.full_name,
                phone: user.phone,
                pharmacy_name: user.pharmacy_name,
                status: user.status,
                token
            });
        } catch (err) { next(err); }
    }
);

// ==================== FORCED PASSWORD CHANGE ====================
/**
 * Completes a login for an account whose password an admin reset to the
 * shared default (must_change_password = 1).
 *
 * Deliberately NOT behind requireAuth: the whole point of the flag is that
 * no session exists yet for these accounts, so there is no token to present.
 * Instead this re-verifies username + current password exactly as /login does
 * - same lookup, same lockout enforcement, same failed-attempt accounting,
 * same account-status gates - so it is no more reachable than login itself.
 * Only after the new password is stored does it mint a session, which is what
 * makes "log in with the default password" impossible to complete without
 * actually replacing that password.
 */
router.post('/change-password',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('current_password').notEmpty().withMessage('Current password is required'),
        body('new_password').isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/)
            .withMessage('Password needs 8+ chars incl. uppercase, lowercase, digit and special character')
    ],
    validate,
    async (req, res, next) => {
        try {
            const { username, current_password, new_password } = req.body;

            const user = await db.get(
                `SELECT user_id, username, email, password_hash, role, full_name, phone, pharmacy_name, status,
                        failed_login_attempts, locked_until, rejection_reason
                 FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
                [username, username]
            );

            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return res.status(423).json({
                    error: `Account locked until ${user.locked_until} due to repeated failed login attempts`
                });
            }

            const currentMatches = await bcrypt.compare(current_password, user.password_hash);
            if (!currentMatches) {
                // Same lockout accounting as /login, so this endpoint can't be
                // used as an unthrottled way to guess the current password.
                const attempts = (user.failed_login_attempts || 0) + 1;
                let lockedUntil = null;
                if (attempts >= config.loginMaxAttempts) {
                    lockedUntil = new Date(Date.now() + config.loginLockoutMinutes * 60 * 1000).toISOString();
                }
                await db.run(
                    'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?',
                    [lockedUntil ? 0 : attempts, lockedUntil, user.user_id]
                );
                if (lockedUntil) {
                    return res.status(423).json({ error: 'Account locked for 30 minutes after 5 failed attempts' });
                }
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // A correct current password still doesn't entitle a blocked
            // account to a session - mirror /login's status gates exactly.
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'Your registration is still awaiting administrator approval.' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({
                    error: user.rejection_reason
                        ? `Your registration was rejected by an administrator. Reason: ${user.rejection_reason}`
                        : 'Your registration was rejected by an administrator.',
                    rejection_reason: user.rejection_reason || null
                });
            }
            if (user.status === 'inactive') {
                return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
            }

            // Reject no-op and known-value "changes". Without these, the whole
            // flow could be satisfied by re-entering the very default password
            // it exists to get rid of.
            if (new_password === current_password) {
                return res.status(400).json({ error: 'Your new password must be different from your current password.' });
            }
            if (new_password === config.defaultResetPassword) {
                return res.status(400).json({ error: 'Please choose a password other than the temporary one you were given.' });
            }
            if (new_password.toLowerCase().includes(user.username.toLowerCase())) {
                return res.status(400).json({ error: 'Password must not contain the username' });
            }

            const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);
            await db.run(
                `UPDATE users
                 SET password_hash = ?, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL
                 WHERE user_id = ?`,
                [passwordHash, user.user_id]
            );

            // Any stale sessions are invalidated by the password change, so a
            // session opened before the change can't outlive it.
            await db.run('DELETE FROM sessions WHERE user_id = ?', [user.user_id]);

            const { token } = await createSession(user.user_id, user.role);

            // Same payload shape as /login so the frontend can reuse its
            // existing post-login path verbatim.
            res.json({
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.full_name || user.username,
                full_name: user.full_name,
                phone: user.phone,
                pharmacy_name: user.pharmacy_name,
                status: user.status,
                password_changed: true,
                token
            });
        } catch (err) { next(err); }
    }
);

// ==================== LOGOUT (FR19) ====================
router.post('/logout', requireAuth, async (req, res, next) => {
    try {
        await destroySession(req.user.token);
        res.json({ message: 'Logged out successfully' });
    } catch (err) { next(err); }
});

// ==================== SESSION CHECK ====================
router.get('/session', requireAuth, async (req, res) => {
    res.json({ userId: req.user.id, role: req.user.role, valid: true });
});

module.exports = router;
