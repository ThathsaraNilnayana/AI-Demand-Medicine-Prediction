const fs = require('fs');
const extraLogic = `
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
            toggleDropdown('notif-dropdown', notifBtn, \`
                <div class="p-4 bg-surface-container-lowest border border-glass-border rounded-xl shadow-2xl text-white w-72" style="background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(20px);">
                    <h4 class="font-bold border-b border-white/10 pb-3 mb-2 flex justify-between items-center">
                        Notifications <span class="bg-primary px-2 py-0.5 rounded-full text-[10px]">0 New</span>
                    </h4>
                    <div class="py-8 text-center flex flex-col items-center gap-2 opacity-50">
                        <span class="material-symbols-outlined text-4xl">notifications_paused</span>
                        <span class="text-sm">You're all caught up!</span>
                    </div>
                </div>
            \`);
        };
    }
    if (settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown('settings-dropdown', settingsBtn, \`
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
            \`);
        };
    }
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown('profile-dropdown', avatar, \`
                <div class="p-2 bg-surface-container-lowest border border-glass-border rounded-xl shadow-2xl text-white w-56" style="background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(20px);">
                    <div class="flex items-center gap-3 p-3 border-b border-white/10 mb-2">
                        <img src="\${avatar.src}" class="w-10 h-10 rounded-full border border-white/20">
                        <div class="overflow-hidden">
                            <div class="font-bold text-sm truncate">Current User</div>
                            <div class="text-xs text-gray-400">System Admin</div>
                        </div>
                    </div>
                    <div class="px-3 py-2.5 text-sm hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3" onclick="window.location.href='../admin_dashboard/code.html'">
                        <span class="material-symbols-outlined text-[18px]">dashboard</span> My Dashboard
                    </div>
                    <div class="px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors flex items-center gap-3 mt-1 font-bold" onclick="window.location.href='../login_page/code.html'">
                        <span class="material-symbols-outlined text-[18px]">logout</span> Log Out
                    </div>
                </div>
            \`);
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
`;

fs.appendFileSync('stitch/appLogic.js', extraLogic, 'utf8');
console.log('Appended top nav logic!');
