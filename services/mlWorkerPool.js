/**
 * Persistent worker pool for ml/predict.py's `--serve` mode.
 *
 * Why this exists (measured, see ml/predict.py's serve_forever() docstring
 * for the numbers): every module-level import in predict.py - pandas,
 * numpy, scikit-learn, statsmodels - costs roughly 1.6s of CPU on a warm
 * disk cache, and the old code paid that cost again on every single
 * `python predict.py` invocation. With one process spawned per medicine,
 * the nightly regeneration job (~2,969 medicines) spent close to 80 minutes
 * purely re-importing the same libraries before any model fitting happened.
 *
 * This module keeps a small, fixed-size pool of `python predict.py --serve`
 * processes alive across requests. Each worker pays the import cost exactly
 * once, at startup, then answers a stream of {monthly, horizon} requests
 * over its stdin/stdout (one line-delimited JSON object each way, matched
 * up by an `id` field) for as long as the pool lives.
 *
 * Kept deliberately small by default (config.mlWorkerCount): Render's free
 * tier is a single shared vCPU with limited RAM. More workers than the
 * hardware can actually run concurrently mostly means more idle Python
 * interpreters competing for the same core, not more throughput - see
 * DEFAULT_WORKER_COUNT below.
 *
 * If the pool can't stay up (predict.py --serve keeps crashing on startup,
 * e.g. because of an environment problem), it disables itself and every
 * request falls back to the original one-shot `python predict.py` spawn -
 * slower, but the exact behavior this whole file replaces, so a broken
 * pool degrades to "as before", not "predictions stop working".
 */
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const config = require('../config');

const ENGINE_PATH = path.join(__dirname, '..', 'ml', 'predict.py');

// One shared vCPU on Render's free tier. Two workers let one job's
// model-fitting phase (numpy/scipy/statsmodels release the GIL for a good
// chunk of that C-level work) overlap with another job's import/I-O phase,
// without oversubscribing a single core badly enough to slow both down.
// This is a sane starting point, not a measured optimum for every
// deployment - ML_WORKER_COUNT exists precisely so it can be tuned without
// a code change once someone has real numbers from their own instance size.
const DEFAULT_WORKER_COUNT = 2;

// Generous headroom for a Tier-3 SARIMA+STL fit on a slow shared core. This
// is a safety valve against a wedged worker silently blocking its slot
// forever, not a tuned figure - if it's ever hit in practice that's worth
// investigating on its own, not just raising the number.
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;

/** One long-lived `predict.py --serve` process plus its in-flight request bookkeeping. */
class Worker {
    constructor(pool) {
        this.pool = pool;
        this.pending = new Map(); // request id -> { resolve, reject, timer }
        this.nextReqId = 1;
        this.busy = false;
        this.dead = false;
        this._spawn();
    }

    _spawn() {
        // Without this, each worker's numpy/scipy/statsmodels calls default
        // to spreading their BLAS/OpenMP math across every core the machine
        // has (measured: 2 threads on a 2-core box, with no env var set).
        // That means N concurrent workers don't get N-way parallelism at
        // all - they fight each other for the same cores, and a pool of
        // e.g. 2 workers measured NO speedup over running requests one at a
        // time until this was pinned. Forcing each worker to exactly one
        // math thread is what lets the OS actually schedule multiple
        // workers on multiple cores in parallel, which is the entire point
        // of having a pool bigger than one worker.
        const singleThreadedEnv = {
            ...process.env,
            OMP_NUM_THREADS: '1',
            OPENBLAS_NUM_THREADS: '1',
            MKL_NUM_THREADS: '1',
            NUMEXPR_NUM_THREADS: '1',
            VECLIB_MAXIMUM_THREADS: '1',
        };
        this.proc = spawn(config.pythonBin, [ENGINE_PATH, '--serve'], { env: singleThreadedEnv });
        this.stderrTail = '';
        this.proc.stderr.on('data', (chunk) => {
            // Keep only a tail - this is diagnostic context for a crash
            // report, not something we want to let grow unbounded if a
            // worker misbehaves and writes a lot of stderr.
            this.stderrTail = (this.stderrTail + chunk).slice(-2000);
        });

        this.rl = readline.createInterface({ input: this.proc.stdout });
        this.rl.on('line', (line) => this._onLine(line));

        this.proc.on('exit', (code) => this._onExit(code));
        this.proc.on('error', (err) => this._onExit(null, err));
    }

    _onLine(line) {
        if (!line.trim()) return;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch (e) {
            // A non-JSON line from a worker means it's in a state we don't
            // understand; don't guess which pending request it belongs to.
            // Any request actually waiting on this worker will hit its own
            // timeout and get retried/reported rather than hanging silently.
            return;
        }
        const pending = this.pending.get(msg.id);
        if (!pending) return; // stray or duplicate response - ignore
        this.pending.delete(msg.id);
        clearTimeout(pending.timer);
        this.busy = this.pending.size > 0;
        pending.resolve(msg);
        this.pool._onWorkerFree();
    }

    _onExit(code, err) {
        if (this.dead) return; // already handled (e.g. we killed it ourselves after a timeout)
        this.dead = true;
        const reason = err ? err.message : `predict.py --serve exited with code ${code}${this.stderrTail ? `: ${this.stderrTail}` : ''}`;
        for (const { reject, timer } of this.pending.values()) {
            clearTimeout(timer);
            reject(new Error(`ML worker crashed mid-request: ${reason}`));
        }
        this.pending.clear();
        this.pool._onWorkerDied(this);
    }

    /** Sends one request; the returned promise settles when its response line arrives, or on crash/timeout. */
    send(monthlySeries, horizon, timeoutMs) {
        return new Promise((resolve, reject) => {
            if (this.dead) return reject(new Error('ML worker is not running'));
            const id = String(this.nextReqId++);
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`ML worker timed out after ${Math.round(timeoutMs / 1000)}s; restarting it`));
                this._killAndRespawn();
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            this.busy = true;
            try {
                this.proc.stdin.write(JSON.stringify({ id, monthly: monthlySeries, horizon }) + '\n');
            } catch (e) {
                clearTimeout(timer);
                this.pending.delete(id);
                this.busy = this.pending.size > 0;
                reject(new Error(`Failed to write to ML worker: ${e.message}`));
            }
        });
    }

    _killAndRespawn() {
        if (this.dead) return;
        this.dead = true;
        try { this.proc.kill(); } catch (e) { /* already gone */ }
        this.pool._onWorkerDied(this);
    }

    shutdown() {
        this.dead = true;
        try { this.rl.close(); } catch (e) { /* ignore */ }
        try { this.proc.stdin.end(); } catch (e) { /* ignore */ }
        try { this.proc.kill(); } catch (e) { /* already gone */ }
    }
}

class MLWorkerPool {
    constructor(size, timeoutMs) {
        this.size = size;
        this.timeoutMs = timeoutMs;
        this.queue = []; // { monthlySeries, horizon, resolve, reject }
        this.workers = [];
        this.respawnCount = 0;
        // If workers keep dying immediately (e.g. `python` can't run
        // `predict.py --serve` at all in this environment) don't loop
        // forever respawning them - fall back to one-shot spawns, which is
        // exactly the pre-pool behavior, so predictions keep working.
        this.maxRespawns = Math.max(10, size * 5);
        this.disabled = false;
        this.started = false;
    }

    _ensureStarted() {
        if (this.started) return;
        this.started = true;
        for (let i = 0; i < this.size; i++) this.workers.push(new Worker(this));
    }

    _onWorkerFree() {
        this._dispatch();
    }

    _onWorkerDied(worker) {
        this.workers = this.workers.filter((w) => w !== worker);
        if (this.disabled) return;

        this.respawnCount++;
        if (this.respawnCount > this.maxRespawns) {
            console.error(
                `[mlWorkerPool] worker pool respawned more than ${this.maxRespawns} times; ` +
                `disabling the pool and falling back to one-shot "python predict.py" spawns for the rest of this process's life.`
            );
            this.disabled = true;
            // Anything still queued would otherwise wait forever for a pool
            // that's no longer accepting work - drain it through the
            // fallback path instead of leaving callers hanging.
            const queued = this.queue.splice(0);
            for (const task of queued) {
                runOneShot(task.monthlySeries, task.horizon).then(task.resolve, task.reject);
            }
            return;
        }

        this.workers.push(new Worker(this));
        this._dispatch();
    }

    _dispatch() {
        if (this.disabled) return;
        while (true) {
            const idle = this.workers.find((w) => !w.busy && !w.dead);
            if (!idle || this.queue.length === 0) return;
            const task = this.queue.shift();
            idle.send(task.monthlySeries, task.horizon, this.timeoutMs).then(task.resolve, task.reject);
        }
    }

    /** Runs one prediction request through the pool (or the one-shot fallback if the pool is disabled). */
    run(monthlySeries, horizon) {
        this._ensureStarted();
        if (this.disabled) return runOneShot(monthlySeries, horizon);

        return new Promise((resolve, reject) => {
            this.queue.push({ monthlySeries, horizon, resolve, reject });
            this._dispatch();
        });
    }

    /** Kills every worker process. Call this on server shutdown so a redeploy/restart doesn't orphan Python processes. */
    shutdown() {
        for (const w of this.workers) w.shutdown();
        this.workers = [];
    }
}

/**
 * Original one-shot behavior: spawn a fresh `python predict.py`, write one
 * request to stdin, parse the single JSON object it prints on close. This
 * is both the pool's crash/disable fallback AND still exactly correct on
 * its own - it's what runPredictionEngine() did before this module existed.
 */
function runOneShot(monthlySeries, horizon) {
    return new Promise((resolve, reject) => {
        const proc = spawn(config.pythonBin, [ENGINE_PATH]);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk; });
        proc.stderr.on('data', (chunk) => { stderr += chunk; });

        proc.on('error', (err) => reject(new Error(`Failed to start Python ML engine: ${err.message}`)));

        proc.on('close', (code) => {
            if (code !== 0 && !stdout) {
                return reject(new Error(`ML engine exited with code ${code}: ${stderr}`));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                reject(new Error(`ML engine returned invalid JSON: ${stdout || stderr}`));
            }
        });

        proc.stdin.write(JSON.stringify({ monthly: monthlySeries, horizon }));
        proc.stdin.end();
    });
}

// Singleton pool, lazily started on the first real request (not at
// `require()` time) so merely requiring this module - e.g. transitively,
// while loading routes at server startup - doesn't spawn Python processes
// before anything actually needs a prediction.
const size = Number(config.mlWorkerCount) > 0 ? Number(config.mlWorkerCount) : DEFAULT_WORKER_COUNT;
const pool = new MLWorkerPool(size, DEFAULT_REQUEST_TIMEOUT_MS);

module.exports = {
    runPredictionEngine: (monthlySeries, horizon) => pool.run(monthlySeries, horizon),
    runOneShot,
    shutdown: () => pool.shutdown(),
};
