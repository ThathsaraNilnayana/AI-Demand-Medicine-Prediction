const { validationResult } = require('express-validator');

/**
 * Runs after an array of express-validator checks; if any failed,
 * responds 400 with the full list of field errors instead of letting
 * bad data reach SQLite (FR2/3/4/5/6, FR25).
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
}

module.exports = { validate };
