require('dotenv').config();

module.exports = {
    port: Number(process.env.PORT) || 3000,
    sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES) || 30,
    loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
    loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES) || 30,
    safetyStockFactor: Number(process.env.SAFETY_STOCK_FACTOR) || 0.20,
    lowStockThresholdMultiplier: Number(process.env.LOW_STOCK_THRESHOLD_MULTIPLIER) || 2,
    pythonBin: process.env.PYTHON_BIN || 'python',
    dbPath: require('path').join(__dirname, 'pharmacast.db')
};
