const fs = require('fs');
let html = fs.readFileSync('stitch/admin_dashboard/code.html', 'utf8');

// 1. Add explicit onclick to Top Nav
html = html.replace(/<a([^>]+)href="([^"]+)"([^>]*)>/g, '<a$1href="$2" onclick="window.location.href=\'$2\'; return false;"$3>');

// 2. Add explicit onclick to Admin Functions buttons
html = html.replace(/<button class="w-full flex items-center justify-between p-4 bg-surface-container-lowest([^>]+)>/g, '<button class="w-full flex items-center justify-between p-4 bg-surface-container-lowest$1" onclick="window.location.href=\'../pending_registration_approvals/code.html\'; return false;">');
html = html.replace(/<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high([^>]+)>\s*<div class="flex items-center gap-4">\s*<span class="material-symbols-outlined text-primary">cloud_upload<\/span>/g, '<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high$1" onclick="window.location.href=\'../upload_sales_data/code.html\'; return false;">\n<div class="flex items-center gap-4">\n<span class="material-symbols-outlined text-primary">cloud_upload</span>');
html = html.replace(/<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high([^>]+)>\s*<div class="flex items-center gap-4">\s*<span class="material-symbols-outlined text-primary">medication_liquid<\/span>/g, '<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high$1" onclick="window.location.href=\'../manage_medicines/code.html\'; return false;">\n<div class="flex items-center gap-4">\n<span class="material-symbols-outlined text-primary">medication_liquid</span>');
html = html.replace(/<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high([^>]+)>\s*<div class="flex items-center gap-4">\s*<span class="material-symbols-outlined text-primary">analytics<\/span>/g, '<button class="w-full flex items-center justify-between p-4 hover:bg-surface-container-high$1" onclick="window.location.href=\'../pharmacist_dashboard_1/code.html\'; return false;">\n<div class="flex items-center gap-4">\n<span class="material-symbols-outlined text-primary">analytics</span>');


// Add beautiful CSS
const beautifulCSS = `
<style>
  :root {
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
    --glow-blue: 0 0 20px rgba(79, 140, 255, 0.5);
    --glow-purple: 0 0 20px rgba(167, 139, 250, 0.5);
  }
  body {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%) !important;
    color: #e2e8f0 !important;
  }
  .bg-surface-container-lowest, .bg-primary-container, .bg-surface-container-low {
    background: var(--glass-bg) !important;
    backdrop-filter: blur(12px) !important;
    border: 1px solid var(--glass-border) !important;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
    color: #fff !important;
  }
  .bg-surface-container-lowest:hover {
    box-shadow: var(--glow-blue) !important;
    transform: translateY(-2px);
    transition: all 0.3s ease;
  }
  .text-primary, .text-tertiary-fixed-dim {
    color: #38bdf8 !important;
  }
  .text-on-surface-variant, .text-slate-500, .text-outline, .text-outline-variant {
    color: #94a3b8 !important;
  }
  .text-on-surface {
    color: #f8fafc !important;
  }
  .clinical-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
    box-shadow: var(--glow-purple) !important;
    color: white !important;
  }
  nav {
    background: rgba(15, 23, 42, 0.8) !important;
    border-bottom: 1px solid var(--glass-border) !important;
  }
  .font-headline {
    text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
  }
  .material-symbols-outlined {
    text-shadow: 0 0 10px rgba(255,255,255,0.3) !important;
  }
  /* Fix nav link colors */
  nav a.text-slate-500 {
    color: #94a3b8 !important;
  }
  nav a.text-slate-500:hover {
    color: #38bdf8 !important;
    text-shadow: 0 0 8px rgba(56, 189, 248, 0.6) !important;
  }
  nav a.text-\\[\\#002045\\] {
    color: #38bdf8 !important;
    border-color: #38bdf8 !important;
  }
  /* Hover for admin function buttons */
  button.hover\\:bg-surface-container-high:hover {
    background: rgba(255,255,255,0.15) !important;
    box-shadow: var(--glow-blue) !important;
  }
  td.px-6.py-5 {
    color: #e2e8f0 !important;
  }
  .bg-primary-fixed\\/30 { background: rgba(56, 189, 248, 0.2) !important; color: #38bdf8 !important; }
  .bg-secondary-container\\/20 { background: rgba(167, 139, 250, 0.2) !important; color: #a78bfa !important; }
  .bg-tertiary-fixed\\/20 { background: rgba(52, 211, 153, 0.2) !important; color: #34d399 !important; }
</style>
`;

html = html.replace('</style>', '</style>\n' + beautifulCSS);

fs.writeFileSync('stitch/admin_dashboard/code.html', html, 'utf8');
console.log('Dashboard upgraded successfully!');
