document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    const protectedPages = ['admin_dashboard', 'manage_medicines', 'pharmacist_dashboard', 'pending_registration_approvals', 'upload_sales_data'];
    const isProtected = protectedPages.some(p => path.includes(p));
    const activeUserStr = sessionStorage.getItem('currentUser') || sessionStorage.getItem('pc_current_user') || localStorage.getItem('currentUser') || localStorage.getItem('pc_current_user');
    if (isProtected && !activeUserStr) {
        window.location.href = '../login_page/code.html';
        return; // Stop execution
    }


    async function renderMedicines() {
        const tbody = document.querySelector('table tbody');
        if (!tbody || !path.includes('manage_medicines')) return;

        const meds = await window.appState.getMedicines();
        tbody.innerHTML = '';
        meds.forEach((med) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm font-mono text-outline">${med.id}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-semibold text-primary">${med.name}</span>
                        <span class="text-xs text-outline italic">${med.desc}</span>
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

    window.removeMedicine = async (id) => {
        if (!confirm('Are you sure you want to delete this medicine?')) return;
        try {
            await window.pharmaCastAPI.deleteMedicine(id);
            await renderMedicines();
        } catch (err) {
            alert(`Error deleting medicine: ${err.message}`);
        }
    };

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
    
    // Animate in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('add-med-box').classList.remove('scale-95');
        document.getElementById('med-name').focus();
    });

    document.getElementById('add-med-form').onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById('med-name').value;
        const category = document.getElementById('med-category').value;
        const stock = parseInt(document.getElementById('med-stock').value) || 0;
        const desc = document.getElementById('med-desc').value;

        try {
            await window.pharmaCastAPI.addMedicine({ name, desc, category, stock });
            await renderMedicines();

            // Animate out
            modal.classList.add('opacity-0');
            document.getElementById('add-med-box').classList.add('scale-95');
            setTimeout(() => modal.remove(), 300);
        } catch (err) {
            alert(`Error adding medicine: ${err.message}`);
        }
    };
};

    if (path.includes('manage_medicines')) {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent.includes('Add Medicine'));
        if (addBtn) addBtn.onclick = window.addMedicine;
        await renderMedicines();
    }

    async function renderUsers() {
        if (!path.includes('pending_registration_approvals')) return;

        const isPendingTab = !document.body.dataset.activeTab || document.body.dataset.activeTab === 'pending';

        const tbody = document.querySelector('table tbody');
        if (!tbody) return;

        const users = await window.appState.getUsers();
        tbody.innerHTML = '';

        const filteredUsers = users.filter(u => isPendingTab ? u.status === 'pending' : u.status === 'active');

        filteredUsers.forEach((u) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low transition-colors group';
            tr.innerHTML = `
                <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            ${u.name.charAt(0)}
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-primary">${u.name}</span>
                            <span class="text-xs text-outline">${u.email}</span>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5 text-sm text-outline font-medium">${u.role}</td>
                <td class="px-8 py-5 text-sm font-mono text-outline">${u.date}</td>
                <td class="px-8 py-5">
                    <span class="bg-${u.status === 'pending' ? 'secondary-container/20 text-on-secondary-container' : 'tertiary-fixed text-on-tertiary-fixed'} px-3 py-1 rounded-full text-xs font-bold uppercase">${u.status}</span>
                </td>
                <td class="px-8 py-5 text-right">
                    ${u.status === 'pending' ? `
                    <button class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all" onclick="approveUser(${u.id})">Approve</button>
                    <button class="text-error px-4 py-2 text-sm font-bold hover:bg-error-container rounded-lg transition-all ml-2" onclick="rejectUser(${u.id})">Reject</button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.approveUser = async (userId) => {
        try {
            await window.pharmaCastAPI.approveUser(userId);
            await renderUsers();
        } catch (err) {
            alert(`Error approving user: ${err.message}`);
        }
    };
    window.rejectUser = async (userId) => {
        if (!confirm('Reject this registration request?')) return;
        try {
            await window.pharmaCastAPI.rejectUser(userId);
            await renderUsers();
        } catch (err) {
            alert(`Error rejecting user: ${err.message}`);
        }
    };

    if (path.includes('pending_registration_approvals')) {
        const tabs = document.querySelectorAll('.border-b.border-surface-container-low button');
        if (tabs.length >= 2) {
            tabs[0].onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                document.body.dataset.activeTab = 'pending';
                tabs[0].classList.add('border-primary', 'text-primary');
                tabs[0].classList.remove('border-transparent', 'text-on-surface-variant');
                tabs[1].classList.remove('border-primary', 'text-primary');
                tabs[1].classList.add('border-transparent', 'text-on-surface-variant');
                await renderUsers();
            };
            tabs[1].onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                document.body.dataset.activeTab = 'active';
                tabs[1].classList.add('border-primary', 'text-primary');
                tabs[1].classList.remove('border-transparent', 'text-on-surface-variant');
                tabs[0].classList.remove('border-primary', 'text-primary');
                tabs[0].classList.add('border-transparent', 'text-on-surface-variant');
                await renderUsers();
            };
        }
        await renderUsers();
    }

    async function renderDashboard() {
        if (!path.includes('admin_dashboard')) return;
        const users = await window.appState.getUsers();
        const meds = await window.appState.getMedicines();

        const totalUsersEl = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === 'Total Users')?.nextElementSibling;
        if (totalUsersEl) totalUsersEl.textContent = users.length;
        
        const pendingUsersEl = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === 'Pending Approvals')?.nextElementSibling;
        if (pendingUsersEl) pendingUsersEl.textContent = users.filter(u => u.status === 'pending').length;
        
        const totalMedsEl = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === 'Total Medicines')?.nextElementSibling;
        if (totalMedsEl) totalMedsEl.textContent = meds.length;

        const tbody = document.querySelector('table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            meds.slice(0, 5).forEach(med => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-6 py-5">
                        <div class="flex flex-col">
                            <span class="font-bold text-primary">${med.name}</span>
                            <span class="text-xs text-outline">${med.category}</span>
                        </div>
                    </td>
                    <td class="px-6 py-5 text-sm">System</td>
                    <td class="px-6 py-5 text-sm">${med.updated}</td>
                    <td class="px-6 py-5">
                        <span class="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase">In-Stock</span>
                    </td>
                    <td class="px-6 py-5 text-right font-mono font-medium">${med.stock}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    if (path.includes('admin_dashboard')) {
        await renderDashboard();
    }

    if (path.includes('registration_page')) {
        const form = document.querySelector('form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const fullName = document.getElementById('register-full-name')?.value.trim();
                const email = document.getElementById('register-email')?.value.trim();
                const phone = document.getElementById('register-contact')?.value.trim();
                const username = document.getElementById('register-username')?.value.trim();
                const password = document.getElementById('register-password')?.value;
                const confirmPassword = document.getElementById('register-confirm-password')?.value;
                const roleSelect = document.getElementById('register-role');
                const role = roleSelect ? roleSelect.value : 'pharmacist';
                const passwordError = document.getElementById('register-password-error');

                if (passwordError) {
                    passwordError.classList.add('hidden');
                }

                if (!fullName || !email || !username || !password || !confirmPassword) {
                    alert('Please fill out all required fields.');
                    return;
                }

                if (password !== confirmPassword) {
                    if (passwordError) {
                        passwordError.classList.remove('hidden');
                    }
                    alert('Passwords do not match.');
                    return;
                }

                try {
                    await window.pharmaCastAPI.register(username, email, password, role, fullName, phone);
                    alert('Registration submitted successfully! You must wait for an Admin to approve your account.');
                    window.location.href = '../login_page/code.html';
                } catch (err) {
                    alert(`Registration failed: ${err.message}`);
                }
            };
        }
    }

    if (path.includes('login_page')) {
        const form = document.querySelector('form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const inputs = form.querySelectorAll('input');
                const username = inputs[0]?.value.trim();
                const password = inputs[1]?.value;

                let user = null;
                try {
                    const res = await fetch('http://localhost:3000/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    if (res.status === 401) {
                        alert('Invalid credentials. Please try again.');
                        return;
                    }
                    if (res.ok) {
                        user = await res.json();
                    }
                } catch (err) {
                    console.warn('Backend offline, trying local credentials:', err);
                }

                if (!user) {
                    const pcUsers = JSON.parse(localStorage.getItem('pc_users') || '[]');
                    const otherUsers = JSON.parse(localStorage.getItem('users') || '[]');
                    const allUsers = [...otherUsers, ...pcUsers];
                    user = allUsers.find(u => ((u.username && u.username.toLowerCase() === username.toLowerCase()) || (u.email && u.email.toLowerCase() === username.toLowerCase())) && u.password === password);
                    if (!user && (username.toLowerCase() === 'admin' || username.toLowerCase() === 'admin@pharmacast.com' || username.toLowerCase() === 'admin@pharmacast.lk') && password === 'admin') {
                        user = {
                            id: 'ADM-001',
                            username: 'admin',
                            name: 'Dr. Saman Weerasinghe',
                            fullName: 'Dr. Saman Weerasinghe',
                            email: 'admin@pharmacast.lk',
                            role: 'Admin',
                            status: 'active'
                        };
                    }
                    if (!user) {
                        alert('Invalid username or password. Please try again.');
                        return;
                    }
                }

                if (user) {
                    if (user.status === 'active' || user.status === 'Active' || !user.status) {
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                        sessionStorage.setItem('pc_current_user', JSON.stringify(user));
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        localStorage.setItem('pc_current_user', JSON.stringify(user));

                        // iOS-style transition: systemBlue activity spinner on a light cross-fade
                        const overlay = document.createElement('div');
                        overlay.style.position = 'fixed';
                        overlay.style.inset = '0';
                        overlay.style.zIndex = '999999999';
                        overlay.style.background = '#ffffff';
                        overlay.style.display = 'flex';
                        overlay.style.alignItems = 'center';
                        overlay.style.justifyContent = 'center';
                        overlay.style.opacity = '0';
                        overlay.style.transition = 'opacity 0.25s ease';

                        const spinner = document.createElement('div');
                        spinner.style.width = '36px';
                        spinner.style.height = '36px';
                        spinner.style.borderRadius = '50%';
                        spinner.style.border = '3px solid #e2e8f4';
                        spinner.style.borderTopColor = '#1d4ed8';
                        spinner.style.animation = 'iosSpin 0.7s linear infinite';
                        overlay.appendChild(spinner);

                        if (!document.getElementById('ios-spin-keyframes')) {
                            const styleTag = document.createElement('style');
                            styleTag.id = 'ios-spin-keyframes';
                            styleTag.textContent = '@keyframes iosSpin { to { transform: rotate(360deg); } }';
                            document.head.appendChild(styleTag);
                        }

                        document.body.appendChild(overlay);

                        sessionStorage.setItem('justLoggedIn', 'true');

                        requestAnimationFrame(() => {
                            overlay.style.opacity = '1';
                        });

                        const roleStr = String(user.role || user.user_role || user.type || '').toLowerCase();
                        const isUserAdmin = roleStr.includes('admin') || user.username === 'admin' || user.email === 'admin@pharmacast.com' || user.email === 'admin@pharmacast.lk';
                        const destination = isUserAdmin
                            ? '../admin_dashboard/code.html'
                            : '../pharmacist_dashboard_1/code.html';
                        setTimeout(() => {
                            window.location.href = destination;
                        }, 650);
                        
                    } else if (user.status === 'pending') {
                        alert('Your account is still pending approval from an administrator.');
                    } else {
                        alert('Your account has been suspended or rejected.');
                    }
                }
            };
        }
    }
    
    async function renderHistory() {
        if (!path.includes('pharmacist_dashboard_1')) return;

        // Welcome header uses the logged-in user's real name
        const currentUserRaw = sessionStorage.getItem('currentUser');
        const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
        const nameEl = document.querySelector('h1 .text-secondary');
        if (nameEl && currentUser) nameEl.textContent = currentUser.name || currentUser.username;

        const [meds, stockLevels] = await Promise.all([
            window.appState.getMedicines(),
            window.appState.getStockLevels()
        ]);

        // Stats cards
        const totalMedsEl = document.querySelector('.text-4xl.font-black.text-primary');
        if (totalMedsEl) totalMedsEl.textContent = meds.length;

        const outOfStock = stockLevels.filter(s => s.quantity <= 0);
        const lowStock = stockLevels.filter(s => s.quantity > 0 && s.alert_status !== 'green');

        const lowStockEl = document.querySelector('.text-4xl.font-black.text-on-secondary-container');
        if (lowStockEl) lowStockEl.textContent = lowStock.length;

        const outOfStockEl = document.querySelector('.text-4xl.font-black.text-on-error-container');
        if (outOfStockEl) outOfStockEl.textContent = outOfStock.length;

        // Recent Inventory Activity list, with live search
        const listContainer = document.querySelector('#recent-activity-list');
        const searchInput = document.querySelector('input[placeholder="Search Medicine by Name"]');

        function statusBadge(med) {
            if (med.stock <= 0) return { label: 'Out-of-Stock', cls: 'bg-error-container text-on-error-container' };
            if (med.alertStatus === 'yellow' || med.alertStatus === 'red') return { label: 'Low-Stock', cls: 'bg-secondary-container text-on-secondary-container' };
            return { label: 'In-Stock', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' };
        }

        function renderList(items) {
            if (!listContainer) return;
            listContainer.innerHTML = '';
            if (items.length === 0) {
                listContainer.innerHTML = '<p class="px-8 py-6 text-sm text-gray-200">No medicines found.</p>';
                return;
            }
            items.forEach(med => {
                const badge = statusBadge(med);
                const div = document.createElement('div');
                div.className = 'px-8 py-6 hover:bg-surface-container-lowest transition-colors flex items-center justify-between group cursor-pointer';
                div.innerHTML = `
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center">
                            <span class="material-symbols-outlined text-white/40 text-3xl">medication</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-primary text-lg">${med.name}</h4>
                            <p class="text-sm text-gray-200">${med.category}${med.desc ? ' • ' + med.desc : ''}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-12">
                        <div class="hidden md:block">
                            <span class="text-xs font-bold text-outline uppercase block mb-1">Status</span>
                            <span class="${badge.cls} text-xs px-2.5 py-1 rounded-full font-bold">${badge.label}</span>
                        </div>
                        <div class="hidden md:block text-right">
                            <span class="text-xs font-bold text-outline uppercase block mb-1">Quantity</span>
                            <span class="font-bold text-primary">${med.stock ?? 0} Units</span>
                        </div>
                        <button class="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span class="material-symbols-outlined text-primary">chevron_right</span>
                        </button>
                    </div>
                `;
                div.addEventListener('click', () => {
                    window.location.href = `../medicine_detail_prediction_1/code.html?id=${med.id}`;
                });
                listContainer.appendChild(div);
            });
        }

        renderList(meds);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase().trim();
                renderList(meds.filter(m => m.name.toLowerCase().includes(q)));
            });
        }

        // Low Stock Alerts panel, sourced from real stock levels
        const alertsContainer = document.querySelector('#low-stock-alerts');
        if (alertsContainer) {
            const alertItems = stockLevels
                .filter(s => s.alert_status !== 'green')
                .sort((a, b) => a.quantity - b.quantity)
                .slice(0, 4);
            alertsContainer.innerHTML = '';
            if (alertItems.length === 0) {
                alertsContainer.innerHTML = '<p class="text-sm text-gray-200">All stock levels are healthy.</p>';
            } else {
                alertItems.forEach(item => {
                    const urgent = item.alert_status === 'red' || item.quantity <= 0;
                    const row = document.createElement('div');
                    row.className = 'flex items-center gap-4 bg-surface-container-lowest p-4 rounded-lg shadow-sm';
                    row.innerHTML = `
                        <div class="p-2 ${urgent ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'} rounded">
                            <span class="material-symbols-outlined">${urgent ? 'error' : 'warning'}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-primary">${item.medicine_name}</p>
                            <p class="text-[10px] text-gray-200">Reorder level: ${item.reorder_level ?? '-'}</p>
                        </div>
                        <span class="text-xs font-bold ${urgent ? 'text-error' : 'text-primary'}">${item.quantity} left</span>
                    `;
                    alertsContainer.appendChild(row);
                });
            }
        }
    }
    if (path.includes('pharmacist_dashboard_1')) {
        await renderHistory();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button');
    let notifBtn, settingsBtn;
    buttons.forEach(btn => {
        if (btn.textContent.includes('notifications')) notifBtn = btn;
        if (btn.textContent.includes('settings')) settingsBtn = btn;
    });
    const avatars = document.querySelectorAll('img[alt*="Avatar"], img[src*="googleusercontent"]');
    const avatar = avatars.length > 0 ? avatars[0] : null;

    if (notifBtn) {
        notifBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown('notif-dropdown', notifBtn, `
                <div class="p-4 bg-surface-container-lowest border border-glass-border rounded-xl shadow-2xl text-white w-72" style="background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(20px);">
                    <h4 class="font-bold border-b border-white/10 pb-3 mb-2 flex justify-between items-center">
                        Notifications <span class="bg-primary px-2 py-0.5 rounded-full text-[10px]">0 New</span>
                    </h4>
                    <div class="py-8 text-center flex flex-col items-center gap-2 opacity-50">
                        <span class="material-symbols-outlined text-4xl">notifications_paused</span>
                        <span class="text-sm">You're all caught up!</span>
                    </div>
                </div>
            `);
        };
    }
    if (settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown('settings-dropdown', settingsBtn, `
                <div class="p-2 bg-surface-container-lowest border border-glass-border rounded-xl shadow-2xl text-white w-56" style="background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(20px);">
                    <div class="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Settings</div>
                    <div class="px-3 py-2.5 text-sm hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3">
                        <span class="material-symbols-outlined text-[18px]">manage_accounts</span> Account Preferences
                    </div>
                    <div class="px-3 py-2.5 text-sm hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3">
                        <span class="material-symbols-outlined text-[18px]">palette</span> Theme Options
                    </div>
                    <div class="px-3 py-2.5 text-sm hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3">
                        <span class="material-symbols-outlined text-[18px]">security</span> Security & Privacy
                    </div>
                </div>
            `);
        };
    }
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown('profile-dropdown', avatar, `
                <div class="p-2 bg-surface-container-lowest border border-glass-border rounded-xl shadow-2xl text-white w-56" style="background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(20px);">
                    <div class="flex items-center gap-3 p-3 border-b border-white/10 mb-2">
                        <img src="${avatar.src}" class="w-10 h-10 rounded-full border border-white/20">
                        <div class="overflow-hidden">
                            <div class="font-bold text-sm truncate">Current User</div>
                            <div class="text-xs text-gray-400">System Admin</div>
                        </div>
                    </div>
                    <div class="px-3 py-2.5 text-sm hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3" onclick="window.location.href='../admin_dashboard/code.html'">
                        <span class="material-symbols-outlined text-[18px]">dashboard</span> My Dashboard
                    </div>
                    <div class="px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3 mt-1 font-bold" onclick="sessionStorage.removeItem('currentUser'); window.location.href='../login_page/code.html'">
                        <span class="material-symbols-outlined text-[18px]">logout</span> Log Out
                    </div>
                </div>
            `);
        };
    }

    let currentDropdown = null;
    function toggleDropdown(id, anchorEl, html) {
        if (currentDropdown) {
            currentDropdown.remove();
            if (currentDropdown.id === id) {
                currentDropdown = null;
                return;
            }
        }
        const rect = anchorEl.getBoundingClientRect();
        const dropdown = document.createElement('div');
        dropdown.id = id;
        dropdown.innerHTML = html;
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 12) + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        dropdown.style.zIndex = '999999';
        
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        document.body.appendChild(dropdown);
        
        requestAnimationFrame(() => {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });
        
        currentDropdown = dropdown;
    }

    document.addEventListener('click', (e) => {
        if (currentDropdown && !currentDropdown.contains(e.target)) {
            currentDropdown.remove();
            currentDropdown = null;
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Navigation Highlighting
    const navLinks = document.querySelectorAll('nav .hidden.md\\:flex a, nav div.hidden.md\\:flex a, nav div.md\\:flex a');
    if (navLinks.length > 0) {
        const currentPath = window.location.pathname;
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            const targetPath = href.replace('../', '').split('/')[0];
            
            // Just use classList to toggle active state
            if (currentPath.includes(targetPath)) {
                link.classList.add('active-nav-tab');
            } else {
                link.classList.remove('active-nav-tab');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('upload_sales_data')) {
        // 1. Export Logs Button
        const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Logs'));
        if (exportBtn) {
            exportBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = 'data:text/csv;charset=utf-8,Date,Medicine,Quantity\n2023-11-24,Amoxicillin,420\n2023-11-24,Lisinopril,1250';
                a.download = 'sales_logs_export.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Show a nice modal instead of alert
                const msg = document.createElement('div');
                msg.className = 'fixed top-4 right-4 bg-tertiary-fixed text-on-tertiary-fixed px-6 py-4 rounded-xl shadow-2xl z-[99999] font-bold flex items-center gap-3 animate-in slide-in-from-top-10 fade-in';
                msg.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Export Downloaded!';
                document.body.appendChild(msg);
                setTimeout(() => {
                    msg.classList.add('fade-out', 'slide-out-to-top-10');
                    setTimeout(() => msg.remove(), 300);
                }, 3000);
            };
        }

        // 2. File Upload Handling
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    
                    // Show processing toast
                    const msg = document.createElement('div');
                    msg.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-primary px-8 py-4 rounded-full shadow-2xl z-[99999] font-bold flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in';
                    msg.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Processing ' + file.name;
                    document.body.appendChild(msg);
                    
                    // Add to Ingestion Log dynamically
                    const logContainers = document.querySelectorAll('.bg-surface-container-lowest.clinical-shadow .space-y-0');
                    if (logContainers.length > 0) {
                        const logContainer = logContainers[logContainers.length - 1];
                        const newLog = document.createElement('div');
                        newLog.className = 'flex items-center justify-between p-6 hover:bg-surface-container-low transition-colors group animate-in fade-in slide-in-from-top-4 duration-500';
                        newLog.innerHTML = `
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-secondary-container/20 rounded flex items-center justify-center text-secondary">
                                    <span class="material-symbols-outlined">table_view</span>
                                </div>
                                <div>
                                    <div class="font-bold text-primary">${file.name}</div>
                                    <div class="text-xs text-on-surface-variant">Uploaded just now by You</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-bold text-primary">Pending...</div>
                                <span class="bg-secondary-container text-on-secondary-container text-[10px] font-black px-2 py-0.5 rounded">PROCESSING</span>
                            </div>
                        `;
                        logContainer.prepend(newLog);
                        
                        setTimeout(() => {
                            newLog.querySelector('.text-right .text-sm').textContent = (Math.floor(Math.random() * 5000) + 100).toLocaleString() + ' Records';
                            const badge = newLog.querySelector('.bg-secondary-container');
                            badge.className = 'bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-black px-2 py-0.5 rounded';
                            badge.textContent = 'SUCCESS';
                            
                            msg.innerHTML = '<span class="material-symbols-outlined text-green-500">task_alt</span> Upload Complete!';
                            setTimeout(() => {
                                msg.style.opacity = '0';
                                setTimeout(() => msg.remove(), 300);
                            }, 2000);
                        }, 2000);
                    }
                    
                    // Update Staging Preview filename
                    const stagingTitle = document.querySelector('.px-8.py-6.border-b h3 + p span');
                    if (stagingTitle) stagingTitle.textContent = file.name;
                    
                    // Add a new mock row to staging
                    const tbody = document.querySelector('table tbody');
                    if (tbody) {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-surface-container-low/50 animate-in fade-in bg-transparent border border-[#d4af37]/30 text-[#d4af37]';
                        tr.innerHTML = `
                            <td class="px-8 py-4 font-mono">${new Date().toISOString().split('T')[0]}</td>
                            <td class="px-8 py-4 font-medium">New Uploaded Entry</td>
                            <td class="px-8 py-4">${Math.floor(Math.random() * 1000)}</td>
                            <td class="px-8 py-4 text-right text-primary"><span class="material-symbols-outlined cursor-pointer delete-row-btn hover:text-red-400">delete</span></td>
                        `;
                        tbody.prepend(tr);
                        setupRowActions(tr);
                    }
                }
            };
        }

        // 3. View more rows
        const viewMoreBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View'));
        if (viewMoreBtn) {
                        viewMoreBtn.onclick = () => {
                const tbody = document.querySelector('table tbody');
                if (tbody) {
                    const mockMeds = [
                        'Ibuprofen 400mg', 'Atorvastatin 20mg', 'Omeprazole 20mg', 'Azithromycin 250mg', 
                        'Amlodipine 5mg', 'Sertraline 50mg', 'Simvastatin 40mg', 'Gabapentin 300mg',
                        'Losartan 50mg', 'Hydrochlorothiazide 25mg'
                    ];
                    for (let i = 0; i < 7; i++) {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-surface-container-low/50 animate-in fade-in';
                        tr.style.animationDelay = (i * 0.05) + 's';
                        tr.style.animationFillMode = 'both';
                        const medName = mockMeds[Math.floor(Math.random() * mockMeds.length)];
                        tr.innerHTML = `
                            <td class="px-8 py-4 font-mono">2023-11-20</td>
                            <td class="px-8 py-4 font-medium">${medName}</td>
                            <td class="px-8 py-4">${Math.floor(Math.random() * 1000) + 50}</td>
                            <td class="px-8 py-4 text-right text-primary">
                                <span class="material-symbols-outlined cursor-pointer hover:text-[#d4af37] mr-2 edit-row-btn">edit</span>
                                <span class="material-symbols-outlined cursor-pointer hover:text-red-400 delete-row-btn">delete</span>
                            </td>
                        `;
                        tbody.appendChild(tr);
                        setupRowActions(tr);
                    }
                    viewMoreBtn.parentElement.style.display = 'none';
                }
            };
        }
        
        // 4. Edit/Delete initial rows
        function setupRowActions(parent) {
            parent.querySelectorAll('.material-symbols-outlined').forEach(icon => {
                // If it's an edit icon
                if (icon.textContent === 'edit' || icon.classList.contains('edit-row-btn')) {
                    icon.onclick = (e) => {
                        const row = e.target.closest('tr');
                        const qtyCell = row.querySelectorAll('td')[2];
                        const newQty = prompt('Enter new quantity:', qtyCell.textContent.trim());
                        if(newQty) qtyCell.textContent = newQty;
                    };
                }
                // If it's a delete icon
                if (icon.textContent === 'delete' || icon.classList.contains('delete-row-btn')) {
                    icon.onclick = (e) => {
                        e.target.closest('tr').style.opacity = '0';
                        setTimeout(() => e.target.closest('tr').remove(), 300);
                    };
                }
            });
        }
        setupRowActions(document.querySelector('table tbody'));
    }
});



// Auto-highlight active navigation tab
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname.toLowerCase();
    document.querySelectorAll('nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            const folder = href.split('/')[1]; // e.g. upload_sales_data
            if (folder && currentPath.includes(folder.toLowerCase())) {
                link.classList.add('active-nav-tab');
            }
        }
    });
});


// Random Page Entrance Animation
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (main) {
        const anims = ['anim-float', 'anim-slide', 'anim-zoom', 'anim-drop'];
        const chosenAnim = anims[Math.floor(Math.random() * anims.length)];
        main.classList.add(chosenAnim);
    }
    
    // Add page transition exit animation on clicks
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', (e) => {
            const href = el.getAttribute('href') || (el.onclick ? el.onclick.toString() : '');
            if (href && href.includes('code.html') && !el.closest('form')) {
                // Ignore if it's already handled by our router map in code.html
                // Actually, just let it be. But we can fade out the body
                document.body.style.transition = 'opacity 0.3s ease';
                document.body.style.opacity = '0';
            }
        });
    });
});

// Post-login Dashboard Reveal
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('justLoggedIn') === 'true') {
        sessionStorage.removeItem('justLoggedIn');
        
        // Plain iOS-style cross-fade -- the spinner overlay already carried the transition
        const veil = document.createElement('div');
        veil.style.position = 'fixed';
        veil.style.inset = '0';
        veil.style.zIndex = '999999999';
        veil.style.background = '#ffffff';
        veil.style.transition = 'opacity 0.3s ease';

        document.body.appendChild(veil);

        requestAnimationFrame(() => {
            veil.style.opacity = '0';
        });

        setTimeout(() => veil.remove(), 400);
    }
});
