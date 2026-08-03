const fs = require('fs');

// Remove CSS from HTML
const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        if (html.includes('/* Hyper Shake Interactive Glitch */')) {
            const cssStart = html.indexOf('/* Hyper Shake Interactive Glitch */');
            const cssEnd = html.indexOf('</style>', cssStart);
            html = html.substring(0, cssStart) + html.substring(cssEnd);
            fs.writeFileSync(filePath, html, 'utf8');
        }
    }
}
console.log('Removed shake CSS from HTML files');
