import flask # type: ignore
from flask_cors import CORS # type: ignore
import pandas as pd # type: ignore
import joblib # type: ignore
import poplib
import warnings

warnings.filterwarnings('ignore')

app = flask.Flask(__name__)
CORS(app)

# 1. Saved model එක load කිරීම (Model_1_updated.ipynb මගින් හදන file එක)
artifacts = joblib.load('medicine_demand_model.pkl')
final_model = artifacts['model']
poly_transformer = artifacts['poly_transformer']
feature_columns = artifacts['feature_columns']
inventory_db = artifacts['inventory_db']
avg_demand_db = artifacts['avg_demand_db']
forecast_input_db = artifacts['forecast_input_db']

BUFFER_RATE = 1.20  # 20% safety stock


def get_season(month):
    if month in [5, 6, 7, 8, 9]:
        return 'SouthWest_Monsoon'
    elif month in [12, 1, 2]:
        return 'NorthEast_Monsoon'
    return 'Inter_Monsoon'


def find_medicine(name):
    """Exact match මුලින්, ඉන්පසු partial match."""
    name = name.strip().lower()
    if not name:
        return None
    names = list(forecast_input_db.keys())
    for med in names:
        if med.lower() == name:
            return med
    partial = [med for med in names if name in med.lower()]
    return partial[0] if partial else None


@app.route('/medicines', methods=['GET'])
def medicines():
    return flask.jsonify({'status': 'success', 'medicines': sorted(forecast_input_db.keys())})


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = flask.request.get_json(silent=True) or {}
        medicine_name = str(data.get('medicine_name', '')).strip()

        selected_medicine = find_medicine(medicine_name)
        if not selected_medicine:
            return flask.jsonify({'status': 'error',
                            'message': f"'{medicine_name}' Not found in database (or not enough sales history to forecast)"}), 404

        # Web App එකෙන් සැබෑ stock එක එවන්න පුළුවන් (optional)
        if data.get('current_stock') is not None:
            current_stock = float(data['current_stock'])
        else:
            current_stock = float(inventory_db.get(selected_medicine, 0))

        # 2. Feature row එක සකස් කිරීම
        info = forecast_input_db[selected_medicine]
        sample = pd.DataFrame(0.0, index=[0], columns=feature_columns)

        for key in ['Year', 'Month', 'Monthly_Lag_1', 'Monthly_Lag_2', 'Monthly_Rolling_3']:
            sample.loc[0, key] = info[key]
        sample.loc[0, 'Med_Avg_Demand'] = avg_demand_db.get(selected_medicine, 0)

        med_col = f'Medicine Name_{selected_medicine}'
        if med_col in sample.columns:
            sample.loc[0, med_col] = 1.0
        season_col = f"Season_{get_season(info['Month'])}"
        if season_col in sample.columns:
            sample.loc[0, season_col] = 1.0

        # 3. Prediction
        sample_poly = poly_transformer.transform(sample)
        predicted_demand = max(0.0, float(final_model.predict(sample_poly)[0]))

        buffer_stock = predicted_demand * BUFFER_RATE
        reorder_needed = current_stock < buffer_stock
        required_order = max(0.0, buffer_stock - current_stock)

        return flask.jsonify({
            'status': 'success',
            'medicine_name': selected_medicine,
            'forecast_month': f"{info['Year']}-{info['Month']:02d}",
            'current_stock': int(round(current_stock)),
            'predicted_demand': int(round(predicted_demand)),
            'recommended_safety_stock': int(round(buffer_stock)),
            'stock_status': 'LOW_STOCK' if reorder_needed else 'SUFFICIENT_STOCK',
            'reorder_quantity': int(round(required_order))
        })

    except Exception as e:
        return flask.jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
