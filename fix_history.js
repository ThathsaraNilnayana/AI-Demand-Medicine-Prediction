const fs = require('fs');
let html = fs.readFileSync('stitch/pharmacist_dashboard_1/code.html', 'utf8');

// Standardize Top Nav by replacing <header> with <nav> and inner <nav> with <div class="hidden md:flex gap-6">
html = html.replace(/<header class="bg-\[\#f7fafc\]\/80[^>]+>/, '<nav class="fixed top-0 w-full z-50 sticky bg-[#f7fafc]/80 dark:bg-slate-900/80 backdrop-blur-md shadow-[0_20px_40px_rgba(0,32,69,0.06)] font-[\'Manrope\'] antialiased tracking-tight">');
html = html.replace(/<\/header>/, '</nav>');
html = html.replace(/<nav class="hidden md:flex gap-6">/, '<div class="hidden md:flex gap-6">');
html = html.replace(/<\/nav>\s*<\/div>\s*<div class="flex items-center gap-4">/, '</div>\n</div>\n<div class="flex items-center gap-4">');

// Standardize Cards
html = html.replace(/bg-secondary-container\/10/g, 'bg-surface-container-lowest');
html = html.replace(/bg-error-container\/10/g, 'bg-surface-container-lowest');
html = html.replace(/bg-primary p-8 rounded-xl/g, 'bg-surface-container-lowest p-8 rounded-xl');

// Standardize "Recent Inventory Activity" block which is bg-white
html = html.replace(/bg-white rounded-xl/g, 'bg-surface-container-lowest rounded-xl');
// The inner items hover
html = html.replace(/bg-surface-container-low\/50/g, 'bg-surface-container-lowest');
html = html.replace(/bg-surface-container-low\/20/g, 'bg-surface-container-lowest');
// Make the button white instead of primary for contrast
html = html.replace(/bg-white text-primary px-6 py-2.5/g, 'bg-surface-container-lowest text-primary px-6 py-2.5');
html = html.replace(/bg-white p-4 rounded-lg/g, 'bg-surface-container-lowest p-4 rounded-lg');

// Ensure text is white
html = html.replace(/text-primary-container\/40/g, 'text-white/40');
html = html.replace(/text-primary-container/g, 'text-white');

fs.writeFileSync('stitch/pharmacist_dashboard_1/code.html', html, 'utf8');
console.log('Fixed pharmacist dashboard structure!');
