# Goal Description

The objective is to build **PharmaCast**, an AI-Based Medicine Demand Prediction System for local pharmacies in Sri Lanka. The system will be a full-stack Flask application with a SQLite database, featuring role-based access (Admin/Pharmacist), interactive charts, and ML-powered demand forecasting (Linear Regression and SARIMA).

## User Review Required

> [!WARNING]
> Please review the open questions below regarding the CSS framework and directory structure before providing approval.

## Proposed Changes

We will build the Flask application using the existing workspace.

### Core Application Structure
- Initialize a Flask application with `Flask-SQLAlchemy`, `Flask-Bcrypt`, and `Flask-Login` (or session-based auth).
- **`app.py`**: Main application setup.
- **`models.py`**: SQLAlchemy database models.
- **`routes/`**: Blueprints for `auth`, `admin`, and `pharmacist` routes.
- **`utils/ml_forecasting.py`**: Logic for demand prediction using `scikit-learn` (Linear Regression) and `statsmodels` (SARIMA).

### Database Model Definition (`models.py`)
Implementing the exact schema requested:
- `User`: Handles authentication and roles.
- `Medicine`, `Stock`, `SalesData`.
- `Prediction` and `Recommendation` for storing ML results.
- `RegistrationRequest` for the Admin approval workflow.

### Frontend Integration (`templates/` and `static/`)
- Migrate the existing beautiful UI prototypes located in `stitch/` to standard Jinja2 templates (e.g., `layout.html`, `login.html`, `pharmacist_dashboard.html`).
- Refactor the hardcoded data in the charts and stock tables to be dynamically populated by Jinja2 from the Flask backend.

### Machine Learning Engine (`utils/ml_forecasting.py`)
- Nightly pre-computation script (or background job) that processes `SalesData`.
- Applies ML logic based on data length:
  - 6-11 months: Linear Regression
  - 12-23 months: SARIMA (auto-selected)
  - 24+ months: SARIMA with STL
- Calculates safety stock and recommendations (Max(0, Predicted Target + 20% Buff - Current Stock)).

## Open Questions

> [!IMPORTANT]  
> 1. **CSS Framework Compatibility:** The project brief states "Bootstrap 5". However, the HTML prototypes generated in previous sessions (which look fantastic!) are built using **Tailwind CSS**. May I proceed with adapting your existing Tailwind CSS mockups into the Flask templates rather than completely rebuilding them in Bootstrap 5?
> 2. **Project Directory:** Should I set up the Flask application right at the root of `C:\Users\User\Desktop\stitch`, or create a dedicated subdirectory like `C:\Users\User\Desktop\stitch\flask_app` to keep it separated from the old HTML files?

## Verification Plan

### Automated/Manual Verification
- I will run the application locally to ensure routes are properly protected by session/role logic.
- Verify that password hashing and 5-attempt lockout works.
- Upload a mock CSV of Sales Data and verify the correct ML model runs based on the date range, generating accurate chart data.
- Ensure the pharmacist interface renders the Chart.js visualisations correctly.
