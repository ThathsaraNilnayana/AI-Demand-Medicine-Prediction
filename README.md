# PharmaCast

AI-Based Medicine Demand Prediction System for local pharmacies in Sri Lanka.

PharmaCast uses historical sales data and machine learning (Linear Regression /
SARIMA / SARIMA+STL) to forecast monthly medicine demand, visualise seasonal
demand patterns, and recommend optimal stock order quantities.

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | Node.js + Express |
| Database | SQLite locally (`pharmacast.db`) · Postgres in production (see below) |
| ML engine | Python — pandas, NumPy, scikit-learn, statsmodels |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5 |
| Charts | Chart.js |
| Auth | Token sessions + bcrypt password hashing |

## Setup

```bash
# 1. Node dependencies
npm install

# 2. Python dependencies (for the ML engine)
pip install -r ml/requirements.txt

# 3. Create + seed the database
npm run setup-db

# 4. Warm the prediction cache (optional but recommended for first run)
npm run precompute

# 5. Start the server
npm start
```

Then open **http://localhost:3000**.

> Open the app through the server URL above — not by double-clicking
> `index.html`, and not via VS Code Live Server. Opening the file directly
> serves it without a backend, so login, predictions and uploads will all fail.

### Demo accounts

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin` |
| Pharmacist | `rajesh_pharmacist` | `Pharma@123` |

## Persistent storage on Render

**Render's free web services have an ephemeral filesystem.** Per Render's own
docs: *"Whenever a service spins down, any changes to its local filesystem
are lost"* — and a free instance spins down after just 15 minutes of
inactivity. Without the setup below, every sale uploaded, medicine added, or
forecast generated through the UI disappears the next time someone opens the
site after it's been idle. `db.js` automatically switches to a persistent
Postgres backend (`db.postgres.js`) instead of the local SQLite file whenever
a `DATABASE_URL` environment variable is present — nothing else about the
app changes. **Local development is unaffected**: with no `DATABASE_URL` set,
`npm start` keeps using `pharmacast.db` exactly as before, no Postgres
install required.

### One-time setup

1. In the [Render Dashboard](https://dashboard.render.com), **New → Postgres**.
   Choose the **Free** plan (1 GB storage, persists for 30 days from
   creation — see [renewal](#renewing-the-free-postgres-instance) below).
2. Once created, open the Postgres instance and copy its **Internal Database
   URL** (same-region services can use the faster/free internal network path;
   use the *External* URL only if connecting from outside Render, e.g. to run
   the migration script from your own machine).
3. Go to the `pharmacast-api` web service → **Environment** → add a variable:
   - Key: `DATABASE_URL`
   - Value: the connection string from step 2
4. Save, which triggers a redeploy. Watch the deploy logs for `✅ Connected
   to Postgres database` and `✅ Postgres schema ready` — the app creates its
   own tables on first boot, no manual schema step needed.
5. **Copy over what's already in `pharmacast.db`** (skip this for a brand
   new/empty deployment): from a machine that has both `pharmacast.db` and
   network access to the Postgres instance (use the *External* Database URL
   for this step if running it from your own computer rather than a Render
   shell):
   ```bash
   DATABASE_URL="<external database url>" npm run migrate-to-postgres
   ```
   This copies every medicine, sale, stock level, and prediction across,
   preserving IDs. It's safe to re-run - each table is replaced with a fresh
   copy of `pharmacast.db`, not appended to. Session tokens are intentionally
   not migrated (everyone just logs in again).

### Renewing the free Postgres instance

Render's free Postgres databases **expire and are deleted 30 days after
creation** (with a 14-day warned grace period to upgrade first). Before that
deadline, either upgrade the instance to a paid plan from its Render
dashboard page, or create a fresh free instance and re-point `DATABASE_URL`
at it (re-run `npm run migrate-to-postgres` against the new one first).

## Prediction cache (nightly job)

Pharmacist-facing pages read forecasts from the `predictions` table rather than
fitting models on request, so pages load instantly. `scripts/precompute_predictions.js`
refreshes that cache for every medicine:

```bash
npm run precompute
```

Schedule it nightly:

- **Linux / macOS** (`crontab -e`):
  ```
  0 2 * * * cd /path/to/pharmacast && /usr/bin/node scripts/precompute_predictions.js >> logs/precompute.log 2>&1
  ```
- **Windows** (Task Scheduler): Program `node`, arguments
  `scripts\precompute_predictions.js`, "Start in" set to the project folder,
  trigger Daily 02:00.

## Model selection

Chosen automatically from how many months of history a medicine has:

| History | Model |
|---|---|
| < 6 months | No forecast — "Insufficient data for prediction" |
| 6–11 months | Linear Regression + seasonal dummy variables |
| 12–23 months | SARIMA (auto parameters) |
| 24+ months | SARIMA + STL seasonal decomposition |

**Stock recommendation formula**

```
Safety_Stock     = Predicted_Demand × 0.20
Recommended_Order = MAX(0, Predicted_Demand + Safety_Stock − Current_Stock)
```

### How the forecast is produced

The tier table above selects the model, but three things happen around it
that matter when reading the output:

**Missing months are filled, not skipped.** A medicine with sales in Jan,
Feb and Apr is a *four*-month series with March = 0, not a three-month one.
649 of the 2,969 medicines in the shipped database have such gaps. Both
counts are reported: `months_available` (the calendar span the model saw)
and `months_observed` (months actually present in the data).

**Forecasts are shrunk toward a robust level estimate.** This demand data is
intermittent — the median coefficient of variation is 1.11 and most
trainable medicines have zero-sales months. On series like that a pure
trend/seasonal fit largely models noise, and in backtesting a plain
Croston level estimate beat the raw tier models outright. Each tier's output
is therefore blended with a Croston/SBA anchor, using a weight chosen per
medicine by holding out recent months and scoring both. The tier model still
determines the shape of the forecast and is still what gets reported.

**Confidence is measured, not asserted.** It is derived from
`backtest_smape` — genuine out-of-sample error from rolling-origin
validation — and decays across the horizon. It is deliberately capped below
1.0.

> Earlier versions reported confidence as in-sample R², which was ≈1.00 by
> construction on 6–11 month series (12 seasonal dummies fitted to as few as
> 6 points interpolate them exactly). Measured against held-out data that
> score *positively* correlated with error, i.e. it was actively misleading.
> If you are comparing against older screenshots, "confidence 100.0%" was
> that bug, and lower numbers now are more truthful, not worse.

Run `python -m pytest ml/test_predict.py -v` to exercise the engine (43
tests covering gap filling, tier boundaries, degenerate series, and the
CLI contract used by `predictionService.js`).

## Sales data format

Both Admin and Pharmacist accounts can upload historical sales data
(`POST /api/sales/upload`); every imported row is tagged with the uploading
user's ID (`recorded_by`) for audit purposes. Admin retains sole access to
approvals, user management, and medicine record management.

CSV or XLSX, with these columns (header names are matched case-insensitively):

| Column | Format | Example |
|---|---|---|
| Date | `YYYY-MM-DD` | `2026-07-01` |
| Medicine Name | must already exist in the medicines table | `Paracetamol 500mg` |
| Quantity Sold | positive integer | `300` |

Uploads are validated row by row; if any row fails, the whole file is rejected
with per-row error messages and nothing is written (all-or-nothing transaction).

## Project structure

```
├── server.js                 # Express app entry point
├── config.js / db.js         # Configuration + SQLite helpers
├── routes/                   # REST API endpoints (auth, medicines, stock,
│                              #   sales, predictions, recommendations, users, stats)
├── middleware/                # Auth (sessions, roles), validation, errors
├── services/
│   └── predictionService.js  # Shared ML invocation + forecast storage
├── utils/                    # Shared helpers (medicine identity, stock status)
├── scripts/
│   └── precompute_predictions.js   # Nightly cache job
├── ml/
│   └── predict.py            # Tiered forecasting engine
├── migrations/
│   └── setup_database.py     # Schema + seed data
├── index.html                # Pharmacist-facing single-page frontend
├── admin.html                # Admin-facing single-page frontend
├── css/ , js/                # Frontend assets
└── pharmacast.db             # SQLite database
```

## Security notes

- Passwords hashed with bcrypt; plaintext is never stored.
- Sessions expire after 30 minutes of inactivity.
- 5 failed logins within 15 minutes locks the account for 30 minutes.
- Role-based access control enforced on every admin API route
  (`requireRole('admin')`), with a matching guard in the UI.
- All SQL uses parameterised queries.

Admin functionality (user approvals, account management, medicine records)
lives in `admin.html`; `index.html` is the pharmacist-facing app. Both are
served by the same Express backend and enforce role checks server-side via
`requireRole('admin')`.
