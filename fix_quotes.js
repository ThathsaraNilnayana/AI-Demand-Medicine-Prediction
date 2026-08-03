const fs = require('fs');
let html = fs.readFileSync('stitch/admin_dashboard/code.html', 'utf8');

// Fix double quotes
html = html.replace(/gap-2"" onclick=/g, 'gap-2" onclick=');

fs.writeFileSync('stitch/admin_dashboard/code.html', html, 'utf8');
console.log('Fixed double quotes!');
