require('dotenv').config();

module.exports = {
    port: Number(process.env.PORT) || 3000,
    sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES) || 30,
    loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
    loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES) || 30,
    safetyStockFactor: Number(process.env.SAFETY_STOCK_FACTOR) || 0.20,
    lowStockThresholdMultiplier: Number(process.env.LOW_STOCK_THRESHOLD_MULTIPLIER) || 2,
    // Password an admin's "Reset Pass" action sets an account to. Shared by
    // routes/users.routes.js (which sets it) and routes/auth.routes.js (which
    // refuses to let the new password be this value again), so the two can
    // never drift apart.
    defaultResetPassword: process.env.DEFAULT_RESET_PASSWORD || 'Password@123',
    pythonBin: process.env.PYTHON_BIN || 'python',
    // Number of long-lived `python predict.py --serve` processes kept warm
    // by services/mlWorkerPool.js. Default of 2 is conservative for
    // Render's free tier (one shared vCPU, limited RAM) - see that module's
    // header comment for the reasoning. Raise it if you're on hardware with
    // more real cores to spare; ML_WORKER_COUNT=1 disables the parallelism
    // (still gets the "import once, not once per medicine" win) if RAM is
    // tight.
    mlWorkerCount: Number(process.env.ML_WORKER_COUNT) || 2,
    dbPath: require('path').join(__dirname, 'pharmacast.db')
};
