const fs = require('fs');

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Remove animation line from silkWave body::before
        html = html.replace(/animation:\s*silkWave\s+20s[^;]+;/g, '');
        
        // Remove elegantFloatUp animation if it exists, or maybe just leave it since it's just on load. 
        // The user said "tone it down", I'll leave the load animation but remove the heavy background blur animation.
        fs.writeFileSync(filePath, html, 'utf8');
    }
}
console.log('Heavy background animation removed!');
