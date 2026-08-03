const fs = require('fs');

let html = fs.readFileSync('stitch/upload_sales_data/code.html', 'utf8');

const standardNav = `
<!-- Top Navigation Bar -->
<nav class="fixed top-0 w-full z-50 sticky bg-[#f7fafc]/80 dark:bg-slate-900/80 backdrop-blur-md shadow-[0_20px_40px_rgba(0,32,69,0.06)] font-['Manrope'] antialiased tracking-tight">
<div class="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
<div class="flex items-center gap-8">
<span class="text-2xl font-black tracking-tighter text-[#002045] dark:text-white">PharmaCast</span>
<div class="hidden md:flex gap-6">
<a class="text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors active:scale-95 duration-200 ease-in-out" href="../admin_dashboard/code.html" onclick="window.location.href='../admin_dashboard/code.html'; return false;">Dashboard</a>
<a class="text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors active:scale-95 duration-200 ease-in-out" href="../manage_medicines/code.html" onclick="window.location.href='../manage_medicines/code.html'; return false;">Medicines</a>
<a class="text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors active:scale-95 duration-200 ease-in-out" href="../pharmacist_dashboard_1/code.html" onclick="window.location.href='../pharmacist_dashboard_1/code.html'; return false;">History</a>
<a class="text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors active:scale-95 duration-200 ease-in-out" href="../pending_registration_approvals/code.html" onclick="window.location.href='../pending_registration_approvals/code.html'; return false;">Users</a>
<a class="text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors active:scale-95 duration-200 ease-in-out" href="../upload_sales_data/code.html" onclick="window.location.href='../upload_sales_data/code.html'; return false;">Data Management</a>
</div>
</div>
<div class="flex items-center gap-4">
<button class="p-2 text-slate-500 hover:bg-slate-100/50 rounded-lg transition-all active:scale-95">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button class="p-2 text-slate-500 hover:bg-slate-100/50 rounded-lg transition-all active:scale-95">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
<div class="h-8 w-8 rounded-full overflow-hidden bg-surface-container-highest">
<img alt="User Profile Avatar" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkejC-HXBoa3A0lu_K7DIp8NoReLU0I6VHNf3usA0FWjRHr7JC_oosp_aXfjEgfBUmDq3hS0oNRgnrP24rTyMzWK8SiK2JQkk4SHUVv8-hOQ3qPg-6tz1K8zcpqLGlnCPfDIRnYARqxb7Whe8HM8wj6NL19elJxzcIXeRMZ4H-b_8nmLUd-gFLHemZGQtJraCOvfIZU9M8FqT6w8hntDk2j70hHtF38rpCoiua3615i5oSBzXTrz4EgeocENhYBULDhQArR0TOzvKI"/>
</div>
</div>
</div>
</nav>
`;

html = html.replace(/<header[\s\S]*?<\/header>/, standardNav.trim());

fs.writeFileSync('stitch/upload_sales_data/code.html', html, 'utf8');
console.log('Fixed navigation block');
