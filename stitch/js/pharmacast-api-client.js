/**
 * PharmaCast API Client
 * Replaces localStorage with real database API calls
 */

const API_BASE = 'http://localhost:3000/api';

window.pharmaCastAPI = {
    // ==================== MEDICINES ====================
    
    async getMedicines() {
        try {
            const response = await fetch(`${API_BASE}/medicines`);
            if (!response.ok) throw new Error(`Failed to fetch medicines: ${response.status}`);
            const medicines = await response.json();
            
            // Transform to match app expectations
            return medicines.map(med => ({
                id: med.medicine_id,
                name: med.medicine_name,
                desc: med.generic_name || '',
                category: med.category,
                stock: med.stock || med.current_stock,
                price: med.unit_price,
                updated: new Date().toLocaleDateString(),
                alertStatus: med.alert_status || 'green'
            }));
        } catch (err) {
            console.error('Error fetching medicines:', err);
            return [];
        }
    },

    async getMedicineById(id) {
        try {
            const response = await fetch(`${API_BASE}/medicines/${id}`);
            if (!response.ok) throw new Error(`Failed to fetch medicine: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching medicine:', err);
            return null;
        }
    },

    async addMedicine(medicineData) {
        try {
            const response = await fetch(`${API_BASE}/medicines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_name: medicineData.name,
                    generic_name: medicineData.desc,
                    category: medicineData.category,
                    unit_price: medicineData.price || 0,
                    reorder_level: medicineData.reorderLevel || 50,
                    current_stock: medicineData.stock || 0
                })
            });
            if (!response.ok) throw new Error(`Failed to add medicine: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error adding medicine:', err);
            throw err;
        }
    },

    async updateMedicine(id, medicineData) {
        try {
            const response = await fetch(`${API_BASE}/medicines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_name: medicineData.name,
                    generic_name: medicineData.desc,
                    category: medicineData.category,
                    unit_price: medicineData.price || 0,
                    reorder_level: medicineData.reorderLevel || 50,
                    current_stock: medicineData.stock || 0
                })
            });
            if (!response.ok) throw new Error(`Failed to update medicine: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error updating medicine:', err);
            throw err;
        }
    },

    async deleteMedicine(id) {
        try {
            const response = await fetch(`${API_BASE}/medicines/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Failed to delete medicine: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error deleting medicine:', err);
            throw err;
        }
    },

    // ==================== STOCK LEVELS ====================

    async getStockLevels() {
        try {
            const response = await fetch(`${API_BASE}/stock`);
            if (!response.ok) throw new Error(`Failed to fetch stock levels: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching stock levels:', err);
            return [];
        }
    },

    async updateStock(medicineId, quantity, alertStatus) {
        try {
            const response = await fetch(`${API_BASE}/stock/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity, alert_status: alertStatus })
            });
            if (!response.ok) throw new Error(`Failed to update stock: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error updating stock:', err);
            throw err;
        }
    },

    // ==================== SALES DATA ====================

    async getSalesData(medicineId) {
        try {
            const response = await fetch(`${API_BASE}/sales/${medicineId}`);
            if (!response.ok) throw new Error(`Failed to fetch sales data: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching sales data:', err);
            return [];
        }
    },

    async recordSale(medicineId, quantitySold, saleDate, totalAmount, recordedBy) {
        try {
            const response = await fetch(`${API_BASE}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_id: medicineId,
                    quantity_sold: quantitySold,
                    sale_date: saleDate,
                    total_amount: totalAmount,
                    recorded_by: recordedBy
                })
            });
            if (!response.ok) throw new Error(`Failed to record sale: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error recording sale:', err);
            throw err;
        }
    },

    // ==================== PREDICTIONS ====================

    async getPredictions(medicineId = null) {
        try {
            const url = medicineId ? `${API_BASE}/predictions/${medicineId}` : `${API_BASE}/predictions`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch predictions: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching predictions:', err);
            return [];
        }
    },

    async addPrediction(medicineId, predictionMonth, predictedDemand, recommendedOrderQty, confidenceScore, modelType) {
        try {
            const response = await fetch(`${API_BASE}/predictions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_id: medicineId,
                    prediction_month: predictionMonth,
                    predicted_demand: predictedDemand,
                    recommended_order_qty: recommendedOrderQty,
                    confidence_score: confidenceScore,
                    model_type: modelType
                })
            });
            if (!response.ok) throw new Error(`Failed to add prediction: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error adding prediction:', err);
            throw err;
        }
    },

    // ==================== USERS & AUTH ====================

    async getUsers() {
        try {
            const response = await fetch(`${API_BASE}/users`);
            if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
            const users = await response.json();

            // Transform to match app expectations
            return users.map(u => ({
                id: u.user_id,
                name: u.full_name || u.username,
                email: u.email,
                phone: u.phone,
                role: u.role,
                pharmacyName: u.pharmacy_name,
                status: u.status,
                date: new Date(u.created_at).toLocaleDateString()
            }));
        } catch (err) {
            console.error('Error fetching users:', err);
            return [];
        }
    },

    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error(`Login failed: ${response.status}`);
            const user = await response.json();
            // Store in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        } catch (err) {
            console.error('Error during login:', err);
            throw err;
        }
    },

    async register(username, email, password, role, fullName, phone) {
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role, full_name: fullName, phone })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                // Surface the real reason (validation details / duplicate account /
                // server error) instead of a generic message so users know what to fix.
                const detail = Array.isArray(data.details) && data.details.length
                    ? data.details.map(d => d.msg).join(' ')
                    : (data.error || `Registration failed: ${response.status}`);
                throw new Error(detail);
            }
            return data;
        } catch (err) {
            console.error('Error during registration:', err);
            throw err;
        }
    },

    async approveUser(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}/approve`, {
                method: 'PUT'
            });
            if (!response.ok) throw new Error(`Failed to approve user: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error approving user:', err);
            throw err;
        }
    },

    async rejectUser(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Failed to reject user: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error rejecting user:', err);
            throw err;
        }
    },

    // ==================== STATS ====================

    async getDashboardStats() {
        try {
            const response = await fetch(`${API_BASE}/stats`);
            if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching stats:', err);
            return {
                totalMedicines: 0,
                totalStock: 0,
                lowStockItems: 0,
                pendingApprovals: 0
            };
        }
    }
};

console.log('✅ PharmaCast API Client loaded - use window.pharmaCastAPI');
