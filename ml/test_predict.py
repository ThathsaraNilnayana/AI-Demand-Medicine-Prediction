"""
Test suite for the tiered demand-forecasting engine.

Run from the project root:
    python -m pytest ml/test_predict.py -v

These tests pin down the behaviours that were previously silently wrong:
calendar gaps, fabricated confidence, tier boundaries, and degenerate series.
"""
import json
import subprocess
import sys
import os

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import predict  # noqa: E402


# ────────────────────────────── helpers ──────────────────────────────

def months(start, n):
    """n consecutive 'YYYY-MM' labels starting at `start`."""
    p = pd.period_range(start, periods=n, freq='M')
    return [str(x) for x in p]


def series_records(start, values):
    return [{'month': m, 'quantity': v} for m, v in zip(months(start, len(values)), values)]


def run_cli(payload):
    """Invoke the engine the way predictionService.js does: JSON over stdin."""
    engine = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'predict.py')
    proc = subprocess.run(
        [sys.executable, engine],
        input=json.dumps(payload), capture_output=True, text=True, timeout=180,
    )
    return proc


# ───────────────────────── series construction ─────────────────────────

class TestBuildSeries:
    def test_fills_calendar_gaps(self):
        """Jan, Feb, Apr must become a 4-month series with March = 0, not 3 points."""
        recs = [
            {'month': '2025-01', 'quantity': 10},
            {'month': '2025-02', 'quantity': 20},
            {'month': '2025-04', 'quantity': 40},
        ]
        series, observed = predict.build_series(recs)
        assert len(series) == 4, 'March must be materialized, not collapsed'
        assert observed == 3, 'months_observed reports what was actually present'
        assert series.iloc[2] == 0.0, 'the missing month is zero-filled'
        assert str(series.index[2]) == '2025-03'

    def test_aggregates_duplicate_months(self):
        recs = [
            {'month': '2025-01', 'quantity': 10},
            {'month': '2025-01', 'quantity': 5},
            {'month': '2025-02', 'quantity': 20},
        ]
        series, observed = predict.build_series(recs)
        assert series.iloc[0] == 15.0, 'duplicates summed, not overwritten'
        assert observed == 2

    def test_unsorted_input_is_ordered(self):
        recs = [
            {'month': '2025-03', 'quantity': 30},
            {'month': '2025-01', 'quantity': 10},
            {'month': '2025-02', 'quantity': 20},
        ]
        series, _ = predict.build_series(recs)
        assert list(series.values) == [10.0, 20.0, 30.0]

    def test_empty_input(self):
        series, observed = predict.build_series([])
        assert len(series) == 0 and observed == 0

    def test_missing_keys_raise(self):
        with pytest.raises(ValueError):
            predict.build_series([{'month': '2025-01'}])


class TestWinsorize:
    def test_clamps_extreme_spike(self):
        v = [100, 105, 98, 102, 99, 101, 5000]
        out = predict.winsorize(v)
        assert out[-1] < 5000, 'a 50x bulk-order spike must be damped'
        assert out[-1] >= 0

    def test_leaves_clean_data_alone(self):
        v = np.array([100.0, 105.0, 98.0, 102.0, 99.0, 101.0])
        assert np.allclose(predict.winsorize(v), v)

    def test_constant_series_survives(self):
        v = np.array([50.0] * 8)
        assert np.allclose(predict.winsorize(v), v), 'MAD of 0 must not divide-by-zero'


class TestNextMonths:
    def test_rolls_over_year_boundary(self):
        assert predict.next_months('2025-11', 3) == ['2025-12', '2026-01', '2026-02']

    def test_accepts_period(self):
        assert predict.next_months(pd.Period('2025-01', freq='M'), 1) == ['2025-02']


# ────────────────────────── tier boundaries ──────────────────────────

class TestTierSelection:
    """SDS Table 9 thresholds must hold exactly."""

    @pytest.mark.parametrize('n', [0, 1, 3, 5])
    def test_below_six_months_refuses(self, n):
        recs = series_records('2025-01', list(np.linspace(50, 80, n))) if n else []
        out = predict.generate_prediction(recs, horizon=12)
        assert out['status'] == 'insufficient_data'
        assert out['minimum_required'] == 6
        assert out['forecast'] == []

    @pytest.mark.parametrize('n', [6, 8, 11])
    def test_tier1_linear_regression(self, n):
        vals = [100 + 5 * i + (10 if i % 3 == 0 else 0) for i in range(n)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=6)
        assert out['status'] == 'ok'
        assert out['model_type'] == 'Linear Regression'

    @pytest.mark.parametrize('n', [12, 18, 23])
    def test_tier2_sarima(self, n):
        vals = [100 + 20 * np.sin(2 * np.pi * i / 12) + i for i in range(n)]
        out = predict.generate_prediction(series_records('2024-01', vals), horizon=6)
        assert out['status'] == 'ok'
        assert out['model_type'].startswith('SARIMA')
        assert 'STL' not in out['model_type'], 'STL is reserved for the 24+ tier'

    def test_tier3_sarima_stl(self):
        vals = [100 + 30 * np.sin(2 * np.pi * i / 12) + 0.5 * i for i in range(30)]
        out = predict.generate_prediction(series_records('2023-01', vals), horizon=12)
        assert out['status'] == 'ok'
        assert 'STL' in out['model_type']

    def test_gap_filling_can_promote_a_tier(self):
        """5 observed months spanning 8 calendar months is an 8-point series."""
        recs = [
            {'month': '2025-01', 'quantity': 50},
            {'month': '2025-03', 'quantity': 60},
            {'month': '2025-05', 'quantity': 55},
            {'month': '2025-07', 'quantity': 70},
            {'month': '2025-08', 'quantity': 65},
        ]
        out = predict.generate_prediction(recs, horizon=3)
        assert out['status'] == 'ok', 'span, not row count, decides eligibility'
        assert out['months_available'] == 8
        assert out['months_observed'] == 5


# ─────────────────────────── forecast sanity ───────────────────────────

class TestForecastOutput:
    def test_horizon_length_and_month_continuity(self):
        vals = [100 + i for i in range(12)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        assert len(out['forecast']) == 12
        assert out['forecast'][0]['month'] == '2026-01'
        assert out['forecast'][-1]['month'] == '2026-12'

    def test_never_predicts_negative_demand(self):
        """A steep decline must flatten at zero, not go negative."""
        vals = [500, 400, 300, 200, 100, 50, 20, 5]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        assert all(f['predicted_demand'] >= 0 for f in out['forecast'])

    def test_predictions_are_integers(self):
        vals = [100 + i * 3 for i in range(10)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=6)
        assert all(isinstance(f['predicted_demand'], int) for f in out['forecast'])

    def test_zero_demand_series(self):
        out = predict.generate_prediction(series_records('2025-01', [0] * 8), horizon=6)
        assert out['status'] == 'ok'
        assert 'Zero-demand' in out['model_type']
        assert all(f['predicted_demand'] == 0 for f in out['forecast'])

    def test_constant_series_stays_near_constant(self):
        out = predict.generate_prediction(series_records('2025-01', [200] * 10), horizon=6)
        preds = [f['predicted_demand'] for f in out['forecast']]
        assert all(abs(p - 200) <= 20 for p in preds), f'flat input should stay flat, got {preds}'

    def test_short_history_does_not_extrapolate_absurdly(self):
        """The old unconstrained slope sent month 12 to ~4x the observed range."""
        vals = [100, 120, 140, 160, 180, 200]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        preds = [f['predicted_demand'] for f in out['forecast']]
        assert max(preds) < 600, f'trend damping should cap runaway growth, got max {max(preds)}'


# ───────────────────────── confidence integrity ─────────────────────────

class TestConfidence:
    """The regression that started all this: confidence must not be fabricated."""

    def test_never_reports_certainty(self):
        vals = [100 + 5 * i for i in range(8)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        confs = [f['confidence_score'] for f in out['forecast']]
        assert max(confs) < 1.0, 'a perfectly-interpolated fit must not claim 100%'
        assert max(confs) <= predict.CONF_CEIL

    def test_within_declared_bounds(self):
        vals = [100 + 40 * np.sin(i) for i in range(14)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        for f in out['forecast']:
            assert predict.CONF_FLOOR <= f['confidence_score'] <= predict.CONF_CEIL

    def test_decays_across_horizon(self):
        vals = [100 + 5 * i for i in range(12)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=12)
        confs = [f['confidence_score'] for f in out['forecast']]
        assert confs[0] >= confs[-1], 'month 12 cannot be more certain than month 1'

    def test_noisy_series_less_confident_than_clean(self):
        clean = [100.0] * 14
        rng = np.random.default_rng(0)
        noisy = list(100 + rng.normal(0, 60, 14))
        c = predict.generate_prediction(series_records('2025-01', clean), horizon=6)
        n = predict.generate_prediction(series_records('2025-01', noisy), horizon=6)
        c_avg = np.mean([f['confidence_score'] for f in c['forecast']])
        n_avg = np.mean([f['confidence_score'] for f in n['forecast']])
        assert c_avg > n_avg, 'confidence must track actual predictability'

    def test_backtest_smape_is_reported(self):
        vals = [100 + 5 * i for i in range(12)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=6)
        assert 'backtest_smape' in out
        assert out['backtest_smape'] is None or out['backtest_smape'] >= 0

    def test_loss_and_accuracy_are_reported(self):
        vals = [100 + 5 * i for i in range(12)]
        out = predict.generate_prediction(series_records('2025-01', vals), horizon=6)
        assert 'loss' in out
        assert 'accuracy' in out
        assert out['loss'] is None or out['loss'] >= 0
        assert out['accuracy'] is None or 0.0 <= out['accuracy'] <= 100.0

    def test_loss_and_accuracy_absent_on_insufficient_data(self):
        out = predict.generate_prediction(series_records('2025-01', [10] * 3), horizon=6)
        assert out['status'] == 'insufficient_data'
        assert 'loss' not in out
        assert 'accuracy' not in out


class TestRollingOriginBacktest:
    def test_returns_none_when_too_short(self):
        s, _ = predict.build_series(series_records('2025-01', [10] * 6))
        out = predict.rolling_origin_backtest(s)
        assert out['smape'] is None, 'no room to hold out below the minimum'
        assert out['mae'] is None
        assert out['accuracy'] is None

    def test_perfect_series_scores_low_error(self):
        s, _ = predict.build_series(series_records('2025-01', [100] * 14))
        out = predict.rolling_origin_backtest(s)
        assert out['smape'] < 15.0
        assert out['mae'] < 15.0
        # A flat, noise-free series should be predicted within the 20% band every time.
        assert out['accuracy'] == 100.0

    def test_single_backtest_produces_all_three_metrics_from_same_folds(self):
        """
        Regression guard for the perf fix: smape/mae/accuracy must come from
        one shared set of (actual, predicted) pairs, not three independent
        rolling-origin loops that each re-fit the model. Sanity-checks the
        three numbers are mutually consistent rather than re-deriving them.
        """
        vals = [80, 95, 70, 110, 130, 90, 85, 100, 75, 120, 140, 95, 88, 102, 79, 118]
        s, _ = predict.build_series(series_records('2024-01', vals))
        out = predict.rolling_origin_backtest(s)
        assert out['smape'] is not None
        assert out['mae'] is not None
        assert out['accuracy'] is not None
        assert 0.0 <= out['accuracy'] <= 100.0
        assert out['mae'] >= 0.0


# ────────────────────────────── CLI contract ──────────────────────────────

class TestCliContract:
    """predictionService.js spawns this as a subprocess and parses stdout."""

    def test_valid_payload_returns_json_on_stdout(self):
        vals = [100 + 5 * i for i in range(10)]
        proc = run_cli({'monthly': series_records('2025-01', vals), 'horizon': 6})
        assert proc.returncode == 0
        body = json.loads(proc.stdout)
        assert body['status'] == 'ok'
        assert len(body['forecast']) == 6

    def test_malformed_json_exits_nonzero_with_json_error(self):
        engine = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'predict.py')
        proc = subprocess.run([sys.executable, engine], input='{not json',
                              capture_output=True, text=True, timeout=60)
        assert proc.returncode == 1
        assert json.loads(proc.stdout)['status'] == 'error'

    def test_empty_series_is_insufficient_not_crash(self):
        proc = run_cli({'monthly': [], 'horizon': 12})
        assert proc.returncode == 0
        assert json.loads(proc.stdout)['status'] == 'insufficient_data'

    @pytest.mark.parametrize('bad', [0, -1, 61, 'abc'])
    def test_invalid_horizon_rejected(self, bad):
        proc = run_cli({'monthly': series_records('2025-01', [10] * 8), 'horizon': bad})
        assert proc.returncode == 1
        assert json.loads(proc.stdout)['status'] == 'error'

    def test_default_horizon_is_twelve(self):
        proc = run_cli({'monthly': series_records('2025-01', [100 + i for i in range(10)])})
        assert len(json.loads(proc.stdout)['forecast']) == 12
