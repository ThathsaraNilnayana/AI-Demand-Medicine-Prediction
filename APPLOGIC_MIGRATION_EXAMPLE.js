/**
 * PharmaCast Integration Example: Updating appLogic.js for Database
 * 
 * This shows how to convert the existing appLogic.js to use the 
 * API client instead of hardcoded localStorage data.
 */

// OLD WAY (Still works for testing, uses hardcoded data):
// const medicines = window.appState.getMedicines();

// NEW WAY (Uses actual database):
// const medicines = await window.appState.getMedicines();

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    const protectedPages = ['admin_dashboard', 'manage_medicines', 'pharmacist_dashboard', 'pending_registration_approvals', 'upload_sales_data'];
    const isProtected = protectedPages.some(p => path.includes(p));
    if (isProtected && !sessionStorage.getItem('currentUser')) {
        window.location.href = '../login_page/code.html';
        return;
    }

    // ==================== RENDER MEDICINES ====================
    async function renderMedicines() {
        const tbody = document.querySelector('table tbody');
        if (!tbody || !path.includes('manage_medicines')) return;
        
        // NEW: Use API instead of localStorage
        const meds = await window.pharmaCastAPI.getMedicines();
        tbody.innerHTML = '';
        
        meds.forEach((med, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm font-mono text-outline">${med.id}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-semibold text-primary">${med.name}</span>
                        <span class="text-xs text-outline italic">${med.desc || ''}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="bg-secondary-container/20 text-on-secondary-container px-3 py-1 rounded-full text-[11px] font-bold">${med.category}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm font-bold text-primary">${med.stock}</span>
                </td>
                <td class="px-6 py-4 text-sm text-outline">${med.updated}</td>
                <td class="px-6 py-4 text-right space-x-1">
                    <button class="p-2 text-error hover:bg-error-container rounded transition-colors" onclick="removeMedicine(${med.id})">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const skuStat = document.querySelectorAll('.text-3xl.font-headline.font-bold')[0];
        if (skuStat) skuStat.textContent = meds.length;
    }

    // ==================== DELETE MEDICINE ====================
    window.removeMedicine = async (medicineId) => {
        if (confirm('Are you sure you want to delete this medicine?')) {
            try {
                // NEW: Call API to delete from database
                await window.pharmaCastAPI.deleteMedicine(medicineId);
                alert('✅ Medicine deleted successfully');
                await renderMedicines();
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        }
    };

    // ==================== ADD MEDICINE ====================
    window.addMedicine = () => {
        if (document.getElementById('add-med-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'add-med-modal';
        modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
        modal.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.style.backdropFilter = 'blur(10px)';
        
        modal.innerHTML = `
            <div class="bg-surface-container-lowest p-8 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-md transform scale-95 transition-all duration-300" id="add-med-box" style="background: rgba(15, 23, 42, 0.85) !important; backdrop-filter: blur(24px) !important;">
                <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 class="text-2xl font-bold text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#d4af37]">medication</span>
                        New Medicine
                    </h3>
                    <button type="button" class="text-gray-400 hover:text-white transition-colors p-1" onclick="document.getElementById('add-med-modal').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form id="add-med-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">Medicine Name</label>
                        <input type="text" id="med-name" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="e.g. Amoxicillin">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">Category</label>
                            <input type="text" id="med-category" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="e.g. Antibiotic">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">Stock Qty</label>
                            <input type="number" id="med-stock" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="0">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">Price (LKR)</label>
                        <input type="number" id="med-price" step="0.01" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="0">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">Description</label>
                        <textarea id="med-desc" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none resize-none shadow-inner" rows="2" placeholder="Brief description..."></textarea>
                    </div>
                    
                    <button type="submit" class="w-full mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg shadow-cyan-500/40 transform transition-all active:scale-95 border border-cyan-400/30">
                        Save Medicine
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Fade in animation
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('#add-med-box')?.classList.remove('scale-95');
        }, 10);

        const form = modal.querySelector('#add-med-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('med-name').value;
            const category = document.getElementById('med-category').value;
            const stock = parseInt(document.getElementById('med-stock').value);
            const price = parseFloat(document.getElementById('med-price').value) || 0;
            const desc = document.getElementById('med-desc').value;

            // NEW: Use API to add medicine to database
            try {
                const result = await window.pharmaCastAPI.addMedicine({
                    name: name,
                    desc: desc,
                    category: category,
                    price: price,
                    stock: stock
                });
                
                alert(`✅ Medicine added successfully! ID: ${result.id}`);
                modal.remove();
                await renderMedicines();
                
            } catch (error) {
                alert(`❌ Error adding medicine: ${error.message}`);
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

    // ==================== LOAD DASHBOARD STATS ====================
    async function loadDashboardStats() {
        if (path.includes('admin_dashboard')) {
            try {
                // NEW: Get real stats from database
                const stats = await window.pharmaCastAPI.getDashboardStats();
                
                const medicinesCard = document.querySelector('[class*="medicines-total"]');
                const stockCard = document.querySelector('[class*="stock-total"]');
                const lowStockCard = document.querySelector('[class*="low-stock"]');
                const pendingCard = document.querySelector('[class*="pending-approvals"]');
                
                if (medicinesCard) medicinesCard.textContent = stats.totalMedicines;
                if (stockCard) stockCard.textContent = stats.totalStock;
                if (lowStockCard) lowStockCard.textContent = stats.lowStockItems;
                if (pendingCard) pendingCard.textContent = stats.pendingApprovals;
                
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
    }

    // ==================== LOAD PENDING USERS ====================
    async function loadPendingUsers() {
        if (path.includes('pending_registration_approvals')) {
            try {
                // NEW: Get real users from database
                const users = await window.pharmaCastAPI.getUsers();
                const pendingUsers = users.filter(u => u.status === 'pending');
                
                const tbody = document.querySelector('table tbody');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                pendingUsers.forEach(user => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.pharmacy_name || '-'}</td>
                        <td>${user.role}</td>
                        <td>
                            <button onclick="approveUser(${user.user_id})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                                Approve
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                
            } catch (error) {
                console.error('Error loading pending users:', error);
            }
        }
    }

    // ==================== APPROVE USER ====================
    window.approveUser = async (userId) => {
        try {
            // NEW: Approve user via API
            await window.pharmaCastAPI.approveUser(userId);
            alert('✅ User approved successfully');
            await loadPendingUsers();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    };

    // ==================== HANDLE LOGIN ====================
    window.handleLogin = async (username, password) => {
        try {
            // NEW: Login via API
            const user = await window.pharmaCastAPI.login(username, password);
            alert(`✅ Welcome, ${user.username}!`);
            // Redirect based on role
            const dashboardUrl = user.role === 'admin' 
                ? './admin_dashboard/code.html' 
                : './pharmacist_dashboard_1/code.html';
            window.location.href = dashboardUrl;
            
        } catch (error) {
            alert(`❌ Login failed: ${error.message}`);
        }
    };

    // ==================== INITIALIZE PAGE ====================
    await renderMedicines();
    await loadDashboardStats();
    await loadPendingUsers();
});
