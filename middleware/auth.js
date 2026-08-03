const crypto = require('crypto');
const db = require('../db');
const config = require('../config');

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId, role) {
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.sessionTimeoutMinutes * 60 * 1000);
    await db.run(
        `INSERT INTO sessions (session_token, user_id, role, created_at, last_activity, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [token, userId, role, now.toISOString(), now.toISOString(), expiresAt.toISOString()]
    );
    return { token, expiresAt: expiresAt.toISOString() };
}

async function destroySession(token) {
    await db.run('DELETE FROM sessions WHERE session_token = ?', [token]);
}

function extractToken(req) {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) return header.slice(7);
    if (req.body && req.body.token) return req.body.token;
    if (req.query && req.query.token) return req.query.token;
    return null;
}

/**
 * Validates the session token, enforces the inactivity timeout (FR18),
 * and refreshes last_activity on every authenticated request (FR17).
 */
async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ error: 'Authentication required' });

        const session = await db.get('SELECT * FROM sessions WHERE session_token = ?', [token]);
        if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

        const now = new Date();
        const lastActivity = new Date(session.last_activity);
        const inactiveMinutes = (now - lastActivity) / 60000;

        if (inactiveMinutes > config.sessionTimeoutMinutes || now > new Date(session.expires_at)) {
            await destroySession(token);
            return res.status(401).json({ error: 'Session expired due to inactivity' });
        }

        const newExpiresAt = new Date(now.getTime() + config.sessionTimeoutMinutes * 60 * 1000);
        await db.run(
            'UPDATE sessions SET last_activity = ?, expires_at = ? WHERE session_token = ?',
            [now.toISOString(), newExpiresAt.toISOString(), token]
        );

        req.user = { id: session.user_id, role: session.role, token };
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions for this action' });
        }
        next();
    };
}

module.exports = { createSession, destroySession, requireAuth, requireRole, generateToken };
