const fs = require('fs');
let html = fs.readFileSync('stitch/pharmacist_dashboard_1/code.html', 'utf8');

// Strip the hover background classes from cards
html = html.replace(/hover:bg-white/g, '');
html = html.replace(/hover:bg-secondary-container\/20/g, '');
html = html.replace(/hover:bg-error-container\/20/g, '');

// Remove the absolute gradient background in the Quick Action box
html = html.replace(/<div class="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90 transition-transform group-hover:scale-110"><\/div>/g, '');

// In the recent activity block, line 317, 342, 367, there are still hover:bg-surface-container-low/50
html = html.replace(/hover:bg-surface-container-low\/50/g, '');

// Also check if any text is forced to text-on-surface which might be dark in light mode
html = html.replace(/text-on-surface-variant/g, 'text-gray-200');
html = html.replace(/text-on-surface/g, 'text-white');

fs.writeFileSync('stitch/pharmacist_dashboard_1/code.html', html, 'utf8');
console.log('Cleaned up History page specific overrides!');
