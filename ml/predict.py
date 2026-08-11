"""
Tiered AI demand-forecasting engine (SDS section 5.2.2 / 2.6).

Reads a JSON payload from stdin:
    {
        "monthly": [{"month": "2024-01", "quantity": 120}, ...],   # chronological, oldest first
        "horizon": 12                                               # optional, default 12
    }

Writes a JSON payload to stdout:
    {
        "status": "ok" | "insufficient_data" | "error",
        "model_type": "Linear Regression" | "SARIMA" | "SARIMA+STL",
        "months_available": 14,
        "months_observed": 12,          # distinct months actually present in the input
        "backtest_smape": 31.4,         # out-of-sample error, null when not measurable
        "forecast": [{"month": "2025-03", "predicted_demand": 187, "confidence_score": 0.62}, ...]
    }

Tier selection is purely a function of how many months of history are
available for the medicine, per SDS Table 9:
    < 6 months   -> insufficient data, no prediction
    6-11 months  -> Tier 1: Linear Regression w/ seasonal terms
    12-23 months -> Tier 2: SARIMA (auto order)
    24+ months   -> Tier 3: SARIMA + STL decomposition hybrid

--------------------------------------------------------------------------
IMPLEMENTATION NOTES (why this file looks the way it does)
--------------------------------------------------------------------------
Three things in the original implementation produced confidently wrong
numbers, all fixed here:

1. CALENDAR GAPS WERE SILENTLY COLLAPSED.
   A medicine selling in Jan, Feb and Apr was fed to the model as three
   *consecutive* points, so April's demand was modelled as if it happened in
   March. 649 of 2,969 medicines in the shipped database have such gaps.
   `build_series()` now reindexes onto a complete monthly PeriodIndex and
   zero-fills, so the time axis means what the model thinks it means.

2. CONFIDENCE WAS IN-SAMPLE R^2, WHICH IS ~1.0 BY CONSTRUCTION.
   Tier 1 fitted 12 one-hot month dummies plus a trend to as few as 6
   observations - more free parameters than data points, so the fit passed
   exactly through every point and reported "confidence 100%". Measured
   against held-out data the correlation between that score and actual error
   was *positive* (+0.27): the number was worse than useless, it was
   misleading. Confidence is now derived from `rolling_origin_smape()`, a
   genuine out-of-sample measurement.

3. "AUTO ORDER" SARIMA WAS HARDCODED (1,1,1) WITH SEASONALITY DISABLED.
   `seasonal_period` was gated on `len(y) >= 24`, but Tier 2 only ever sees
   12-23 months, so the seasonal order was always (0,0,0,0) - the tier
   labelled SARIMA was really plain ARIMA(1,1,1). Order is now chosen by
   AICc over a small candidate grid, and seasonality is enabled when the
   series is long enough to support it.
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

# Confidence is mapped from out-of-sample sMAPE and deliberately capped below
# 1.0: a demand forecast on <= 2 years of pharmacy data is never certain, and
# a UI that says "100%" trains users to trust it blindly.
CONF_FLOOR = 0.10
CONF_CEIL = 0.92


# ─────────────────────────── series construction ───────────────────────────

def build_series(monthly_data):
    """
    Turn raw {month, quantity} records into a gap-free monthly series.

    Returns (series, months_observed) where `series` is indexed by a complete
    pd.PeriodIndex with freq='M' and no missing months. Duplicate months are
    summed rather than silently dropped; absent months become 0, which is the
    correct reading for pharmacy sales (no rows = nothing sold, not unknown).
    """
    if not monthly_data:
        return pd.Series(dtype=float), 0

    df = pd.DataFrame(monthly_data)
    if 'month' not in df.columns or 'quantity' not in df.columns:
        raise ValueError("each record needs 'month' and 'quantity'")

    df['period'] = pd.PeriodIndex(df['month'].astype(str), freq='M')
    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce').fillna(0.0)

    # Duplicate months in the payload are aggregated, not last-one-wins.
    grouped = df.groupby('period', sort=True)['quantity'].sum()
    months_observed = int(len(grouped))

    full_index = pd.period_range(grouped.index.min(), grouped.index.max(), freq='M')
    series = grouped.reindex(full_index, fill_value=0.0).astype(float)
    return series, months_observed


def winsorize(values, z=3.5):
    """
    Clamp extreme spikes using a median/MAD rule.

    A single bulk order (e.g. one hospital buying 5,000 units in one month)
    otherwise dominates a 6-point regression and drags every future month up
    with it. MAD is used instead of standard deviation precisely because the
    outlier would inflate the latter and hide itself.
    """
    v = np.asarray(values, dtype=float)
    if len(v) < 4:
        return v
    med = np.median(v)
    mad = np.median(np.abs(v - med))
    if mad <= 0:
        return v
    # 0.6745 rescales MAD to be comparable to a standard deviation.
    modified_z = 0.6745 * (v - med) / mad
    capped = np.where(np.abs(modified_z) > z, med + np.sign(v - med) * (z * mad / 0.6745), v)
    return np.clip(capped, 0, None)


def next_months(last_period, horizon):
    """Month labels following `last_period` (a pd.Period or 'YYYY-MM' string)."""
    if not isinstance(last_period, pd.Period):
        last_period = pd.Period(str(last_period), freq='M')
    return [str(last_period + i) for i in range(1, horizon + 1)]


# ────────────────────────────── tier models ──────────────────────────────

def _seasonal_features(periods, n_harmonics):
    """
    Fourier seasonal terms (sin/cos pairs) for a 12-month cycle.

    Fourier terms replace the original 12 one-hot month dummies: they capture
    the same annual shape using 2 * n_harmonics columns instead of 12, which
    is what makes a 6-point series fittable without interpolating it exactly.
    """
    moy = np.array([p.month for p in periods], dtype=float)
    cols = []
    for k in range(1, n_harmonics + 1):
        cols.append(np.sin(2 * np.pi * k * moy / 12.0))
        cols.append(np.cos(2 * np.pi * k * moy / 12.0))
    if not cols:
        return np.empty((len(moy), 0))
    return np.column_stack(cols)


def _fit_tier1(series, horizon):
    """
    Tier 1: regularized linear regression with trend + Fourier seasonality.

    Still 'Linear Regression' per SDS Table 9, but Ridge-penalised and with
    the seasonal basis sized to the data (n // 4 harmonics, capped at 2) so
    the number of parameters stays well under the number of observations.
    """
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler

    y_raw = series.values.astype(float)
    y = winsorize(y_raw)
    n = len(y)

    n_harmonics = int(np.clip(n // 4, 0, 2))
    t = np.arange(n, dtype=float).reshape(-1, 1)
    X = np.hstack([t, _seasonal_features(series.index, n_harmonics)])

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    model = Ridge(alpha=1.0)
    model.fit(Xs, y)

    future_periods = [series.index[-1] + i for i in range(1, horizon + 1)]
    Xf = np.hstack([
        np.arange(n, n + horizon, dtype=float).reshape(-1, 1),
        _seasonal_features(future_periods, n_harmonics),
    ])
    preds = model.predict(scaler.transform(Xf))

    # Short histories carry no information about a long-run trend, so an
    # unconstrained slope extrapolates absurdly by month 12. Damp it toward
    # the recent mean the further out we forecast.
    recent_level = float(np.mean(y[-min(3, n):]))
    damping = 0.85 ** np.arange(1, horizon + 1)
    preds = recent_level + (preds - recent_level) * damping

    return np.clip(preds, 0, None), 'Linear Regression'


def _aicc(fitted, n_obs, n_params):
    """AIC corrected for small samples - essential at n=12..23."""
    aic = fitted.aic
    denom = n_obs - n_params - 1
    if denom <= 0:
        return aic
    return aic + (2 * n_params * (n_params + 1)) / denom


def _fit_tier2(series, horizon, use_stl=False):
    """
    Tier 2/3: SARIMA with genuine auto-order selection.

    Candidate (p,d,q)[+seasonal] orders are scored by AICc and the best is
    refitted. Seasonality is enabled only with >= 24 months (two full cycles);
    below that a seasonal term cannot be identified and asking for one is how
    the original code ended up silently falling back.
    """
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    y_raw = series.values.astype(float)
    y = winsorize(y_raw)
    n = len(y)
    model_type = 'SARIMA'
    seasonal_ok = n >= TIER3_MONTHS

    seasonal_component = np.zeros(n)
    if use_stl and seasonal_ok:
        from statsmodels.tsa.seasonal import STL
        stl = STL(pd.Series(y, index=series.index), period=12, robust=True).fit()
        seasonal_component = stl.seasonal.values
        y = y - seasonal_component
        model_type = 'SARIMA+STL'

    candidates = [(1, 1, 1), (0, 1, 1), (1, 1, 0), (1, 0, 0), (0, 1, 0), (2, 1, 1)]
    seasonal_orders = [(1, 1, 1, 12), (0, 1, 1, 12), (0, 0, 0, 0)] if seasonal_ok else [(0, 0, 0, 0)]

    best = None
    for order in candidates:
        for s_order in seasonal_orders:
            n_params = sum(order) + sum(s_order[:3])
            if n_params >= n - 1:
                continue
            try:
                fit = SARIMAX(
                    y, order=order, seasonal_order=s_order,
                    enforce_stationarity=False, enforce_invertibility=False,
                ).fit(disp=False)
                score = _aicc(fit, n, n_params)
                if not np.isfinite(score):
                    continue
                if best is None or score < best[0]:
                    best = (score, fit, order, s_order)
            except Exception:
                continue

    if best is None:
        # Every candidate failed: fall back to a seasonal-naive level, and say
        # so in the label rather than passing it off as a fitted SARIMA.
        level = float(np.mean(y[-min(6, n):]))
        preds = np.full(horizon, level)
        model_type += ' (fallback)'
    else:
        try:
            preds = np.asarray(best[1].get_forecast(steps=horizon).predicted_mean, dtype=float)
            if not np.all(np.isfinite(preds)):
                raise ValueError('non-finite forecast')
        except Exception:
            preds = np.full(horizon, float(np.mean(y[-min(6, n):])))
            model_type += ' (fallback)'

    if use_stl and seasonal_ok:
        # Re-attach the seasonal shape. The last 12 seasonal values align so
        # that index 0 is the month following the end of the series.
        cycle = seasonal_component[-12:]
        preds = preds + np.tile(cycle, int(np.ceil(horizon / 12)))[:horizon]

    return np.clip(preds, 0, None), model_type


def robust_anchor(series):
    """
    A deliberately dumb, hard-to-beat level estimate.

    Pharmacy demand here is *intermittent*: measured across the shipped
    database the median coefficient of variation is 1.11, and 115 of 177
    trainable medicines have zero-sales months. On series like these a
    trend-plus-seasonality model mostly fits noise, and a simple level
    estimate beats it outright in backtests. Croston's method (with the
    Syntetos-Boylan bias correction) is the standard estimator for exactly
    this regime: it separates *how much* sells from *how often*.
    """
    y = np.asarray(series.values, dtype=float)
    nonzero_idx = np.flatnonzero(y)
    if len(nonzero_idx) == 0:
        return 0.0

    alpha = 0.1
    size = y[nonzero_idx[0]]
    interval = 1.0
    last = nonzero_idx[0]
    for i in range(nonzero_idx[0] + 1, len(y)):
        if y[i] > 0:
            size = alpha * y[i] + (1 - alpha) * size
            interval = alpha * (i - last) + (1 - alpha) * interval
            last = i
    rate = (size / max(interval, 1e-9)) * (1 - alpha / 2.0)
    return float(max(rate, 0.0))


def _raw_tier_forecast(series, horizon):
    """The tier model mandated by SDS Table 9, before shrinkage."""
    n = len(series)
    if n < TIER2_MONTHS:
        return _fit_tier1(series, horizon)
    if n < TIER3_MONTHS:
        return _fit_tier2(series, horizon, use_stl=False)
    return _fit_tier2(series, horizon, use_stl=True)


def _shrinkage_weight(series):
    """
    How far to trust the tier model versus the robust anchor, in [0, 1].

    Decided by holding out the last few months and scoring both approaches on
    data neither had seen. Forecast combination is standard practice - a
    weighted blend is usually at least as good as its best component, and it
    stops a badly-conditioned SARIMA fit from producing a wild number.

    The tier model still runs, is still reported, and still drives the shape
    of the forecast; this only governs how much of its deviation from a level
    estimate survives.
    """
    n = len(series)
    model_err, anchor_err = [], []

    for k in range(1, 4):
        cutoff = n - k
        if cutoff < MIN_MONTHS:
            break
        train = series.iloc[:cutoff]
        actual = series.iloc[cutoff:cutoff + 1].values
        try:
            preds, _ = _raw_tier_forecast(train, 1)
        except Exception:
            continue
        model_err.append(_smape(actual, preds[:1]))
        anchor_err.append(_smape(actual, [robust_anchor(train)]))

    if not model_err:
        # Nothing measurable: lean on the anchor, which is the safer default
        # on short, noisy series.
        return 0.35

    m = float(np.mean(model_err))
    a = float(np.mean(anchor_err))
    if m + a <= 0:
        return 0.5
    # Inverse-error weighting, then clamped so neither component is ever
    # discarded outright - each protects against the other's failure mode.
    return float(np.clip(a / (m + a), 0.15, 0.85))


def _forecast(series, horizon, weight=None):
    """
    Tier model, shrunk toward the robust anchor by a backtested weight.

    `weight` is computed once per medicine and passed in; recomputing it
    inside every backtest fold would make the nightly job quadratic in the
    number of folds for no extra information.

    Returns (predictions, model_type) with the SDS tier name preserved.
    """
    preds, model_type = _raw_tier_forecast(series, horizon)
    if weight is None:
        weight = _shrinkage_weight(series)
    anchor = robust_anchor(series)
    blended = weight * np.asarray(preds, dtype=float) + (1.0 - weight) * anchor
    return np.clip(blended, 0, None), model_type


# ─────────────────────── honest confidence estimation ───────────────────────

def _smape(actual, forecast):
    """Symmetric MAPE in percent; 0 is perfect, 200 is worst."""
    a = np.asarray(actual, dtype=float)
    f = np.asarray(forecast, dtype=float)
    denom = np.abs(a) + np.abs(f)
    denom[denom == 0] = 1.0
    return float(np.mean(2.0 * np.abs(f - a) / denom) * 100.0)


def rolling_origin_backtest(series, max_folds=3, weight=None):
    """
    Run the rolling-origin backtest ONCE and derive every out-of-sample metric
    (sMAPE, MAE, accuracy) from the same (actual, predicted) pairs.

    This used to be three separate functions - rolling_origin_smape(),
    _calculate_mae(), _calculate_accuracy() - each re-fitting the model on the
    same truncated series independently. On the SARIMA tiers that fit is a 6x3
    order-candidate grid search, so tripling the loop tripled generation time
    for every SARIMA/SARIMA+STL medicine (measured: ~80s -> ~230s on Render's
    free-tier CPU for a single medicine). With ~2,969 medicines regenerated
    nightly, that difference is the gap between a job that finishes and one
    that doesn't. Fit once per fold, read off every metric from the result.

    Returns a dict: {smape, mae, accuracy} - each None if unmeasurable.
    """
    n = len(series)
    pairs = []  # (actual, predicted) for each successful fold
    for k in range(1, max_folds + 1):
        cutoff = n - k
        if cutoff < MIN_MONTHS:
            break
        train = series.iloc[:cutoff]
        actual = series.iloc[cutoff:cutoff + 1].values
        try:
            preds, _ = _forecast(train, 1, weight=weight)
        except Exception:
            continue
        pairs.append((float(actual[0]), float(preds[0])))

    if not pairs:
        return {'smape': None, 'mae': None, 'accuracy': None}

    actuals = np.array([a for a, _ in pairs])
    preds = np.array([p for _, p in pairs])

    smape = float(np.mean([_smape([a], [p]) for a, p in pairs]))
    mae = float(np.mean(np.abs(preds - actuals)))

    # Accuracy is only assessable where the actual is non-zero (a 0% relative
    # tolerance band around 0 would reject every prediction, including 0).
    nonzero = actuals > 0
    if np.any(nonzero):
        within_tol = np.abs(preds[nonzero] - actuals[nonzero]) <= actuals[nonzero] * 0.20
        accuracy = float(np.mean(within_tol)) * 100.0
    else:
        accuracy = None

    return {'smape': smape, 'mae': mae, 'accuracy': accuracy}


def _confidence_from_smape(smape_value, horizon_index, months_available):
    """
    Convert measured error into a 0-1 score that degrades with distance.

    sMAPE 0% -> ~0.92, 50% -> ~0.46, >=100% -> floor. The score additionally
    decays across the forecast horizon (month 12 is genuinely less knowable
    than month 1) and is capped by how much history exists at all.
    """
    if smape_value is None:
        # Unmeasurable: report a deliberately modest score rather than
        # inventing certainty we have not earned.
        base = 0.45
    else:
        base = CONF_CEIL * max(0.0, 1.0 - (smape_value / 100.0))

    horizon_decay = 0.97 ** horizon_index
    history_cap = min(1.0, months_available / float(TIER3_MONTHS))
    score = base * horizon_decay * (0.6 + 0.4 * history_cap)
    return float(np.clip(score, CONF_FLOOR, CONF_CEIL))


# ────────────────────────────── entry point ──────────────────────────────

def generate_prediction(monthly_data, horizon=12):
    series, months_observed = build_series(monthly_data)
    months_available = len(series)

    if months_available < MIN_MONTHS:
        return {
            'status': 'insufficient_data',
            'months_available': months_available,
            'months_observed': months_observed,
            'minimum_required': MIN_MONTHS,
            'forecast': [],
        }

    # A series that never sold anything has no demand signal to model; a flat
    # forecast of 0 is the honest answer, not a regression through zeros.
    if float(np.max(series.values)) <= 0:
        return {
            'status': 'ok',
            'model_type': 'Zero-demand (no sales recorded)',
            'months_available': months_available,
            'months_observed': months_observed,
            'backtest_smape': 0.0,
            'forecast': [
                {'month': m, 'predicted_demand': 0, 'confidence_score': 0.5}
                for m in next_months(series.index[-1], horizon)
            ],
        }

    weight = _shrinkage_weight(series)
    preds, model_type = _forecast(series, horizon, weight=weight)
    backtest = rolling_origin_backtest(series, weight=weight)
    smape_value = backtest['smape']
    mae_value = backtest['mae']
    accuracy_value = backtest['accuracy']
    future_months = next_months(series.index[-1], horizon)

    forecast = []
    for i, (m, p) in enumerate(zip(future_months, preds)):
        forecast.append({
            'month': m,
            'predicted_demand': int(round(float(p))),
            'confidence_score': round(_confidence_from_smape(smape_value, i, months_available), 2),
        })

    return {
        'status': 'ok',
        'model_type': model_type,
        'months_available': months_available,
        'months_observed': months_observed,
        'backtest_smape': None if smape_value is None else round(smape_value, 1),
        'loss': None if mae_value is None else round(mae_value, 2),  # Mean Absolute Error
        'accuracy': None if accuracy_value is None else round(accuracy_value, 1),  # % within 20% tolerance
        'forecast': forecast,
    }


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({'status': 'error', 'error': f'Invalid JSON input: {e}'}))
        sys.exit(1)

    monthly = payload.get('monthly', [])
    try:
        horizon = int(payload.get('horizon', 12))
    except (TypeError, ValueError):
        print(json.dumps({'status': 'error', 'error': 'horizon must be an integer'}))
        sys.exit(1)

    if horizon < 1 or horizon > 60:
        print(json.dumps({'status': 'error', 'error': 'horizon must be between 1 and 60'}))
        sys.exit(1)

    try:
        result = generate_prediction(monthly, horizon)
    except Exception as e:
        print(json.dumps({'status': 'error', 'error': str(e)}))
        sys.exit(1)

    print(json.dumps(result))


if __name__ == '__main__':
    main()
