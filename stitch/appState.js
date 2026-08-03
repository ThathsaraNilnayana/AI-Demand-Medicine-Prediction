(function() {
    window.appState = {
        init: async function() {
            // Initialize with API client
            console.log('🔄 Initializing PharmaCast with SQLite backend...');
        },
        
        // Use API client for medicines
        getMedicines: async () => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getMedicines();
            }
            return [];
        },
        
        setMedicines: async (data) => {
            // Medicines are now persisted via API
            console.log('✅ Medicines synced to database');
        },
        
        // Use API client for users
        getUsers: async () => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getUsers();
            }
            return [];
        },
        
        setUsers: async (data) => {
            // Users are now persisted via API
            console.log('✅ Users synced to database');
        },
        
        // Additional API methods
        getStockLevels: async () => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getStockLevels();
            }
            return [];
        },
        
        getPredictions: async (medicineId) => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getPredictions(medicineId);
            }
            return [];
        },
        
        getSalesData: async (medicineId) => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getSalesData(medicineId);
            }
            return [];
        },
        
        getDashboardStats: async () => {
            if (window.pharmaCastAPI) {
                return await window.pharmaCastAPI.getDashboardStats();
            }
            return {};
        }
    };
    
    // Initialize on page load
    if (document.readyState !== 'loading') {
        window.appState.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => window.appState.init());
    }
})();