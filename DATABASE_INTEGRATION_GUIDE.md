# PharmaCast Database Integration Guide

## ✅ Setup Complete

You now have:
1. **SQLite Database** (`pharmacast.db`) with sample data
2. **Node.js/Express Server** (`server.js`) - RESTful API backend
3. **API Client** (`pharmacast-api-client.js`) - Frontend JavaScript library
4. **Updated AppState** (`appState.js`) - Migrated to use API instead of localStorage

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd "e:\Group project\stitch"
npm install
```

This installs:
- `express` - Web framework
- `sqlite3` - SQLite client
- `cors` - Cross-origin support

### Step 2: Start the Server

```bash
npm start
```

You should see:
```
✅ Connected to SQLite database
🚀 PharmaCast API Server running on http://localhost:3000
```

### Step 3: Include API Client in HTML Pages

Add this to your HTML `<head>` before other scripts:

```html
<script src="../js/pharmacast-api-client.js"></script>
```

---

## 📚 API Endpoints

### Medicines
```
GET    /api/medicines              - Get all medicines
GET    /api/medicines/:id          - Get single medicine
POST   /api/medicines              - Add new medicine
PUT    /api/medicines/:id          - Update medicine
DELETE /api/medicines/:id          - Delete medicine
```

### Stock Levels
```
GET    /api/stock                  - Get all stock levels
PUT    /api/stock/:medicineId      - Update stock
```

### Sales Data
```
GET    /api/sales/:medicineId      - Get sales history
POST   /api/sales                  - Record new sale
```

### Predictions
```
GET    /api/predictions            - Get all upcoming predictions
GET    /api/predictions/:medicineId - Get predictions for medicine
POST   /api/predictions            - Add new prediction
```

### Users & Auth
```
GET    /api/users                  - Get all users
POST   /api/login                  - Login user
POST   /api/register               - Register new user
PUT    /api/users/:id/approve      - Approve registration
```

### Dashboard
```
GET    /api/stats                  - Get dashboard statistics
```

---

## 💡 Usage Examples

### In JavaScript

```javascript
// Get all medicines
const medicines = await window.pharmaCastAPI.getMedicines();

// Add new medicine
await window.pharmaCastAPI.addMedicine({
    name: 'Aspirin 100mg',
    desc: 'Aspirin',
    category: 'Antiplatelet',
    price: 25,
    stock: 150
});

// Update stock
await window.pharmaCastAPI.updateStock(1, 200, 'green');

// Record a sale
await window.pharmaCastAPI.recordSale(1, 10, '2026-08-03', 150, 1);

// Get predictions
const predictions = await window.pharmaCastAPI.getPredictions(1);

// Login
const user = await window.pharmaCastAPI.login('rajesh_pharmacist', 'hashed_password_123');

// Get dashboard stats
const stats = await window.pharmaCastAPI.getDashboardStats();
```

---

## 🔄 How It Works

### Before (localStorage)
```
Frontend (HTML/JS)
    ↓ (hardcoded data)
localStorage
```

### Now (SQLite + API)
```
Frontend (HTML/JS)
    ↓ (HTTP requests)
Express API Server
    ↓ (SQL queries)
SQLite Database (pharmacast.db)
    ↓ (JSON responses)
Frontend (HTML/JS)
```

---

## 📊 Sample Data

The database comes pre-populated with:

- **4 Users**:
  - rajesh_pharmacist (Pharmacist)
  - priya_admin (Admin)
  - kamal_pharmacist (Pharmacist)
  - amara_pharmacist (Pending approval)

- **10 Medicines**: Common pharmaceutical products

- **180 Sales Records**: 3 months of historical sales

- **10 Stock Records**: Current inventory levels

- **30 Predictions**: Next 3 months AI forecasts

---

## 🔧 Troubleshooting

### Server won't start
```bash
# Make sure you're in the right directory
cd "e:\Group project\stitch"

# Check if port 3000 is available
netstat -ano | findstr :3000

# If port is in use, kill the process
taskkill /PID <PID> /F
```

### CORS errors
The server already has CORS enabled. Make sure you're accessing from `http://localhost:3000` (not `file://`)

### Database file not found
```bash
# Create it again
python setup_database.py
```

---

## 📝 Next Steps

1. **Update HTML pages** to include the API client script
2. **Modify existing JavaScript** to use `window.pharmaCastAPI` instead of localStorage
3. **Test endpoints** using the examples above
4. **Deploy** to production with proper authentication
5. **Add ML models** for demand prediction (SARIMA, Linear Regression)

---

## 🔐 Security Notes

- Passwords in the sample data are **not hashed** - implement proper password hashing in production
- Add **authentication middleware** to protect API endpoints
- Implement **input validation** for all endpoints
- Use **HTTPS** in production
- Set up **rate limiting**

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check browser console for errors
4. Verify the database exists: `ls pharmacast.db`
