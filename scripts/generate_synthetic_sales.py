import sqlite3
import datetime
import random
import math

def generate_sales():
    conn = sqlite3.connect('pharmacast.db')
    cursor = conn.cursor()
    
    # Clear old data
    cursor.execute("DELETE FROM sales_data")
    cursor.execute("DELETE FROM predictions")
    
    # Get all medicines
    cursor.execute("SELECT medicine_id, unit_price FROM medicines")
    medicines = cursor.fetchall()
    
    today = datetime.date.today()
    
    # Generate 24 months of data
    for med_id, price in medicines:
        # Determine the pattern for this medicine
        base_demand = random.randint(20, 100)
        is_seasonal = random.choice([True, False])
        peak_month = random.randint(1, 12) if is_seasonal else None
        trend = random.uniform(-0.5, 1.5) # Monthly growth
        
        for i in range(24):
            # Go back i months from today
            # To handle month math properly:
            target_date = today.replace(day=1) - datetime.timedelta(days=30 * i)
            # Actually, more precise month subtraction:
            month = today.month - i - 1
            year = today.year + (month // 12)
            month = (month % 12) + 1
            
            # Base logic
            demand = base_demand + (trend * (24 - i))
            
            # Add seasonality
            if is_seasonal:
                # Sine wave peaking at peak_month
                dist = min(abs(month - peak_month), 12 - abs(month - peak_month))
                multiplier = 1.0 + 0.8 * math.cos(dist * math.pi / 6)
                demand *= multiplier
            
            # Add noise
            demand *= random.uniform(0.85, 1.15)
            demand = max(1, int(demand))
            
            sale_date = f"{year}-{month:02d}-15" # middle of month
            total_amount = demand * price
            
            cursor.execute("""
                INSERT INTO sales_data (medicine_id, quantity_sold, sale_date, total_amount, upload_batch)
                VALUES (?, ?, ?, ?, 'synthetic_gen')
            """, (med_id, demand, sale_date, total_amount))
            
    conn.commit()
    conn.close()
    print("Successfully generated 24 months of highly accurate synthetic data!")

if __name__ == '__main__':
    generate_sales()
