"""
Tiered AI demand-forecasting engine (SDS section 5.2.2 / 2.6).

Reads a JSON payload from stdin:
    {
        "monthly": [{"month": "2024-01", "quantity": 120}, ...],   # chronological, oldest first
        "horizon": 12                                               # optional, default 12
    }

Writes a JSON payload to stdout:
    {
        "status": "ok" | "insufficient_data",
        "model_type": "Linear Regression" | "SARIMA" | "SARIMA+STL",
        "months_available": 14,
        "forecast": [{"month": "2025-03", "predicted_demand": 187, "confidence_score": 0.81}, ...]
    }

Tier selection is purely a function of how many months of history are
available for the medicine, per SDS Table 9:
    < 6 months   -> insufficient data, no prediction
    6-11 months  -> Tier 1: Linear Regression w/ seasonal dummy variables
    12-23 months -> Tier 2: SARIMA (auto order)
    24+ months   -> Tier 3: SARIMA + STL decomposition hybrid
"""
import sys
import json
import warnings
from datetime import datetime

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

MIN_MONTHS = 6
TIER2_MONTHS = 12
TIER3_MONTHS = 24


def next_months(last_month_str, horizon):
    last = datetime.strptime(last_month_str, '%Y-%m')
    months = []
    y, m = last.year, last.month
    for _ in range(horizon):
        m += 1
        if m > 12:
            m = 1
            y += 1
        months.append(f'{y:04d}-{m:02d}')
    return months


def tier1_linear_regression(series, horizon):
    """Linear Regression with month-of-year seasonal dummy variables."""
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import OneHotEncoder

    df = series.reset_index()
    df.columns = ['month', 'quantity']
    df['month_index'] = np.arange(len(df))
    df['month_of_year'] = pd.to_datetime(df['month']).dt.month

    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    seasonal = encoder.fit_transform(df[['month_of_year']])

    X = np.hstack([df[['month_index']].values, seasonal])
    y = df['quantity'].values

    model = LinearRegression()
    model.fit(X, y)
    r2 = max(0.0, min(1.0, model.score(X, y)))

    future_months = next_months(df['month'].iloc[-1], horizon)
    future_idx = np.arange(len(df), len(df) + horizon).reshape(-1, 1)
    future_moy = pd.to_datetime([m + '-01' for m in future_months]).month.values.reshape(-1, 1)
    future_seasonal = encoder.transform(future_moy)
    X_future = np.hstack([future_idx, future_seasonal])

    preds = model.predict(X_future)
    preds = np.clip(preds, 0, None)

    return future_months, preds, r2, 'Linear Regression'


def tier2_sarima(series, horizon, use_stl=False):
    """SARIMA (optionally on STL-deseasonalized residuals for Tier 3)."""
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    y = series.values.astype(float)
    seasonal_period = 12 if len(y) >= 24 else 0
    model_type = 'SARIMA'

    if use_stl and len(y) >= 24:
        from statsmodels.tsa.seasonal import STL
        stl = STL(pd.Series(y, index=pd.PeriodIndex(series.index, freq='M')), period=12, robust=True).fit()
        seasonal_component = stl.seasonal.values
        deseasonalized = y - seasonal_component
        model_type = 'SARIMA+STL'
    else:
        deseasonalized = y
        seasonal_component = np.zeros_like(y)

    order = (1, 1, 1)
    seasonal_order = (1, 1, 1, 12) if seasonal_period else (0, 0, 0, 0)

    try:
        sarima_model = SARIMAX(
            deseasonalized, order=order, seasonal_order=seasonal_order,
            enforce_stationarity=False, enforce_invertibility=False
        ).fit(disp=False)
        forecast_res = sarima_model.get_forecast(steps=horizon)
        preds = forecast_res.predicted_mean
        conf_int = forecast_res.conf_int(alpha=0.2)
        width = np.abs(conf_int[:, 1] - conf_int[:, 0])
        mean_abs = max(np.mean(np.abs(preds)), 1e-6)
        confidence = np.clip(1 - (width / (mean_abs * 4)), 0.4, 0.95)
    except Exception:
        # SARIMA failed to converge on this series; fall back to a naive
        # seasonal-mean projection so the pipeline still returns a result.
        preds = np.full(horizon, np.mean(deseasonalized[-min(12, len(deseasonalized)):]))
        confidence = np.full(horizon, 0.5)
        model_type = model_type + ' (fallback)'

    if use_stl and len(y) >= 24:
        seasonal_cycle = seasonal_component[-12:]
        seasonal_extension = np.tile(seasonal_cycle, int(np.ceil(horizon / 12)))[:horizon]
        preds = preds + seasonal_extension

    preds = np.clip(preds, 0, None)
    future_months = next_months(series.index[-1], horizon)
    return future_months, preds, confidence, model_type


def generate_prediction(monthly_data, horizon=12):
    months_available = len(monthly_data)

    if months_available < MIN_MONTHS:
        return {
            'status': 'insufficient_data',
            'months_available': months_available,
            'minimum_required': MIN_MONTHS,
            'forecast': []
        }

    df = pd.DataFrame(monthly_data).sort_values('month')
    series = df.set_index('month')['quantity']

    if months_available < TIER2_MONTHS:
        future_months, preds, confidence, model_type = tier1_linear_regression(series, horizon)
        confidences = [confidence] * horizon
    elif months_available < TIER3_MONTHS:
        future_months, preds, confidences, model_type = tier2_sarima(series, horizon, use_stl=False)
    else:
        future_months, preds, confidences, model_type = tier2_sarima(series, horizon, use_stl=True)

    forecast = [
        {
            'month': m,
            'predicted_demand': int(round(p)),
            'confidence_score': round(float(c), 2)
        }
        for m, p, c in zip(future_months, preds, confidences if hasattr(confidences, '__iter__') else [confidences] * horizon)
    ]

    return {
        'status': 'ok',
        'model_type': model_type,
        'months_available': months_available,
        'forecast': forecast
    }


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({'status': 'error', 'error': f'Invalid JSON input: {e}'}))
        sys.exit(1)

    monthly = payload.get('monthly', [])
    horizon = int(payload.get('horizon', 12))

    try:
        result = generate_prediction(monthly, horizon)
    except Exception as e:
        print(json.dumps({'status': 'error', 'error': str(e)}))
        sys.exit(1)

    print(json.dumps(result))


if __name__ == '__main__':
    main()
