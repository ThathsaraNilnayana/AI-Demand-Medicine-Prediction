# PharmaCast

AI-Based Medicine Demand Prediction System for local pharmacies in Sri Lanka.

PharmaCast uses historical sales data and machine learning (Linear Regression /
SARIMA / SARIMA+STL) to forecast monthly medicine demand, visualise seasonal
demand patterns, and recommend optimal stock order quantities.

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | Node.js + Express |
| Database | SQLite (`pharmacast.db`) |
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
