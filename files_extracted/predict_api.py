"""
Small Flask API that serves your tiered demand-prediction models
(Linear Regression, SARIMA, SARIMA+STL) to your Node.js Medi-Plus app.

Run locally:
    pip install flask joblib statsmodels
    python predict_api.py
"""

from flask import Flask, request, jsonify
import joblib
import numpy as np
import statsmodels.api as sm

app = Flask(__name__)

# --- Load your trained models once, at startup ---
# Update these paths to wherever you exported the models from your notebook.
linear_model = joblib.load("models/linear_model.pkl")
sarima_model = sm.load("models/sarima_model.pickle")
sarima_stl_model = sm.load("models/sarima_stl_model.pickle")


def choose_model(medicine_id: str):
    """
    Plug in your tier-selection logic here — e.g. based on how much
    history a medicine has, or how volatile its demand is.
    """
    # Placeholder: always uses SARIMA+STL. Replace with your real rule.
    return sarima_stl_model


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    medicine_id = data.get("medicine_id")
    steps = data.get("steps", 7)  # e.g. forecast 7 days ahead

    model = choose_model(medicine_id)
    forecast = model.forecast(steps=steps)

    return jsonify({
        "medicine_id": medicine_id,
        "forecast": forecast.tolist()
    })


def calculate_recommendation(forecast_values, current_stock, lead_time_days, service_level_z=1.65):
    """
    Turns a raw demand forecast into an actionable reorder recommendation.

    forecast_values: list of daily demand forecasts (e.g. next 30 days)
    current_stock:   units currently on the shelf
    lead_time_days:  days it takes the supplier to deliver a new order
    service_level_z: z-score for desired service level (1.65 ~ 95% coverage)
    """
    avg_daily_demand = float(np.mean(forecast_values))
    demand_std = float(np.std(forecast_values))

    # Demand expected to occur while waiting for the next delivery
    demand_during_lead_time = avg_daily_demand * lead_time_days

    # Buffer for demand spikes/uncertainty during that same window
    safety_stock = service_level_z * demand_std * np.sqrt(lead_time_days)

    reorder_point = demand_during_lead_time + safety_stock
    needs_reorder = current_stock <= reorder_point

    # Order enough to cover the lead-time window again, on top of the buffer
    recommended_order_qty = max(0, round(reorder_point + demand_during_lead_time - current_stock, 2)) \
        if needs_reorder else 0

    return {
        "avg_daily_demand": round(avg_daily_demand, 2),
        "demand_during_lead_time": round(demand_during_lead_time, 2),
        "safety_stock": round(safety_stock, 2),
        "reorder_point": round(reorder_point, 2),
        "current_stock": current_stock,
        "needs_reorder": needs_reorder,
        "recommended_order_qty": recommended_order_qty,
    }


@app.route("/recommend-stock", methods=["POST"])
def recommend_stock():
    data = request.get_json()
    medicine_id = data.get("medicine_id")
    current_stock = data.get("current_stock")
    lead_time_days = data.get("lead_time_days")
    forecast_days = data.get("forecast_days", 30)

    model = choose_model(medicine_id)
    forecast = model.forecast(steps=forecast_days).tolist()

    recommendation = calculate_recommendation(forecast, current_stock, lead_time_days)
    recommendation["medicine_id"] = medicine_id
    recommendation["forecast"] = forecast

    return jsonify(recommendation)


if __name__ == "__main__":
    app.run(port=5000)
