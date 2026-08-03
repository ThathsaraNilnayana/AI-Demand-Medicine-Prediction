"""
Rebuilds pharmacast.db with the complete schema (users w/ lockout fields,
sessions table for server-side session tracking, medicines, sales_data,
stock_levels, predictions) and seeds it with sample data. Passwords are
hashed with bcrypt so the API's bcrypt.compare works against them.

Run from the project root:
    python migrations/setup_database.py
"""
import sqlite3
import os
import random
from datetime import datetime, timedelta

import bcrypt

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pharmacast.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute('PRAGMA foreign_keys = ON')

# Drop and recreate for a clean, consistent schema
cursor.executescript('''
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS stock_levels;
DROP TABLE IF EXISTS sales_data;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS users;
''')

cursor.executescript('''
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('pharmacist', 'admin')) NOT NULL,
    full_name TEXT,
    phone TEXT,
    pharmacy_name TEXT,
    status TEXT CHECK(status IN ('active', 'pending', 'inactive', 'rejected')) DEFAULT 'pending',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    session_token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT,
    unit_price REAL NOT NULL,
    reorder_level INTEGER,
    current_stock INTEGER DEFAULT 0,
    supplier_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_data (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    quantity_sold INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    total_amount REAL,
    recorded_by INTEGER,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
    FOREIGN KEY (recorded_by) REFERENCES users(user_id)
);
CREATE INDEX idx_sales_medicine_date ON sales_data(medicine_id, sale_date);

CREATE TABLE stock_levels (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL UNIQUE,
    quantity INTEGER NOT NULL,
    reorder_level INTEGER,
    alert_status TEXT CHECK(alert_status IN ('green', 'yellow', 'red')) DEFAULT 'green',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);

CREATE TABLE predictions (
    prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    prediction_month DATE NOT NULL,
    predicted_demand INTEGER,
    recommended_order_qty INTEGER,
    confidence_score REAL,
    model_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);
''')


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# Sample users (plaintext passwords noted here for test login only)
users = [
    ('rajesh_pharmacist', 'rajesh@pharmacy.lk', hash_password('Pharma@123'), 'pharmacist', 'Rajesh Kumar', '0771234567', 'City Pharmacy Colombo', 'active'),
    ('admin', 'priya@pharmacy.lk', hash_password('admin'), 'admin', 'Priya Fernando', '0777654321', 'PharmaCast Admin', 'active'),
    ('kamal_pharmacist', 'kamal@pharmacy.lk', hash_password('Pharma@123'), 'pharmacist', 'Kamal Perera', '0719876543', 'Health Hub Pharmacy', 'active'),
    ('amara_pharmacist', 'amara@pharmacy.lk', hash_password('Pharma@123'), 'pharmacist', 'Amara Silva', '0765432198', 'Wellness Pharmacy', 'pending'),
]
cursor.executemany(
    'INSERT INTO users (username, email, password_hash, role, full_name, phone, pharmacy_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    users
)

medicines = [
    ('Paracetamol 500mg', 'Acetaminophen', 'Analgesic', 15.00, 50, 250),
    ('Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 45.00, 30, 180),
    ('Ibuprofen 400mg', 'Ibuprofen', 'NSAID', 20.00, 40, 200),
    ('Aspirin 100mg', 'Aspirin', 'Antiplatelet', 25.00, 35, 150),
    ('Metformin 500mg', 'Metformin', 'Antidiabetic', 30.00, 50, 300),
    ('Atorvastatin 20mg', 'Atorvastatin', 'Lipid Lowering', 55.00, 20, 100),
    ('Omeprazole 20mg', 'Omeprazole', 'PPI', 40.00, 30, 160),
    ('Cetirizine 10mg', 'Cetirizine', 'Antihistamine', 35.00, 25, 120),
    ('Diclofenac 50mg', 'Diclofenac', 'NSAID', 28.00, 30, 140),
    ('Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotic', 50.00, 20, 90),
]
cursor.executemany('''
INSERT INTO medicines (medicine_name, generic_name, category, unit_price, reorder_level, current_stock)
VALUES (?, ?, ?, ?, ?, ?)
''', medicines)

# 18 months of twice-weekly sales history per medicine so the ML tiers have
# enough data to exercise Tier 1 (6-11mo) and Tier 2 (12-23mo) paths.
base_date = datetime.now() - timedelta(days=545)
sales_data = []
for medicine_id in range(1, 11):
    base_qty = random.randint(15, 40)
    day = 0
    while day < 545:
        sale_date = (base_date + timedelta(days=day)).date()
        month = sale_date.month
        seasonal = 1.4 if month in (5, 6, 7, 10, 11) else (0.8 if month in (2, 3) else 1.0)
        quantity = max(1, int(random.gauss(base_qty * seasonal, base_qty * 0.2)))
        total_amount = round(quantity * 25.0, 2)
        recorded_by = random.choice([1, 3])
        sales_data.append((medicine_id, quantity, sale_date, total_amount, recorded_by))
        day += random.choice([3, 4])

cursor.executemany('''
INSERT INTO sales_data (medicine_id, quantity_sold, sale_date, total_amount, recorded_by)
VALUES (?, ?, ?, ?, ?)
''', sales_data)

for medicine_id in range(1, 11):
    quantity = random.randint(50, 300)
    reorder_level = random.randint(20, 50)
    alert_status = 'green' if quantity > reorder_level * 2 else ('yellow' if quantity > reorder_level else 'red')
    cursor.execute('''
    INSERT INTO stock_levels (medicine_id, quantity, reorder_level, alert_status)
    VALUES (?, ?, ?, ?)
    ''', (medicine_id, quantity, reorder_level, alert_status))

conn.commit()

print("SQLite database 'pharmacast.db' rebuilt successfully!")
print(f"   - {len(users)} users (passwords bcrypt-hashed)")
print(f"   - {len(medicines)} medicines")
print(f"   - {len(sales_data)} sales records across ~18 months")
print("   - 10 stock level records")
print("   - sessions table ready; predictions table empty until /api/predictions/generate/:id is called")
print("\nTest logins:")
print("   admin / admin   (admin)")
print("   rajesh_pharmacist / Pharma@123   (pharmacist, active)")
print("   amara_pharmacist / Pharma@123   (pharmacist, pending approval)")

conn.close()
