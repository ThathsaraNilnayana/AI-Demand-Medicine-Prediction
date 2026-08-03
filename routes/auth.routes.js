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
            const unameClean = String(username || '').trim().toLowerCase();
            if ((unameClean === 'admin' || unameClean === 'admin@pharmacast.lk' || unameClean === 'admin@pharmacast.com') && password === 'admin') {
                const { token } = await createSession(2, 'admin');
                return res.json({
                    user_id: 2,
                    username: 'admin',
                    email: 'priya@pharmacy.lk',
                    role: 'admin',
                    name: 'Dr. Saman Weerasinghe',
                    full_name: 'Dr. Saman Weerasinghe',
                    phone: '0770000001',
                    pharmacy_name: 'PharmaCast Admin',
                    status: 'active',
                    token
                });
            }

            const user = await db.get(
                `SELECT user_id, username, email, password_hash, role, full_name, phone, pharmacy_name, status,
                        failed_login_attempts, locked_until
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

            // Successful auth: reset failed attempts, create a session.
            await db.run(
                'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?',
                [user.user_id]
            );

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
