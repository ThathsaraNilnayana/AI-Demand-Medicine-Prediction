const fs = require('fs');
let html = fs.readFileSync('stitch/admin_dashboard/code.html', 'utf8');

// Explicit onclick for Export Reports
html = html.replace(/<button class="px-6 py-3 bg-surface-container-high([^>]+)>\s*<span class="material-symbols-outlined text-sm">download<\/span>\s*Export Reports/g, '<button class="px-6 py-3 bg-surface-container-high$1" onclick="window.location.href=\'../upload_sales_data/code.html\'; return false;">\n<span class="material-symbols-outlined text-sm">download</span>\nExport Reports');

// Explicit onclick for New Entry
html = html.replace(/<button class="px-6 py-3 clinical-gradient text-on-primary rounded-lg([^>]+)>\s*<span class="material-symbols-outlined text-sm">add<\/span>\s*New Entry/g, '<button class="px-6 py-3 clinical-gradient text-on-primary rounded-lg$1" onclick="window.location.href=\'../manage_medicines/code.html\'; return false;">\n<span class="material-symbols-outlined text-sm">add</span>\nNew Entry');

fs.writeFileSync('stitch/admin_dashboard/code.html', html, 'utf8');
console.log('Dashboard buttons upgraded!');
