const fs = require('fs');

// 1. Fix appLogic.js nav highlighting
let logic = fs.readFileSync('stitch/appLogic.js', 'utf8');
const oldLogicStr = `navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Clean up href for matching
            const targetPath = href.replace('../', '').split('/')[0];
            
            // Reset to inactive classes
            link.className = 'text-slate-500 dark:text-slate-400 font-medium hover:text-[#002045] dark:hover:text-white transition-colors';
            
            // If current URL contains the target directory
            if (currentPath.includes(targetPath)) {
                // Apply active classes
                link.className = 'text-[#002045] dark:text-blue-400 font-bold border-b-2 border-[#1a365d] dark:border-blue-500 pb-1';
            }
        });`;

const newLogicStr = `navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            const targetPath = href.replace('../', '').split('/')[0];
            
            // Just use classList to toggle active state
            if (currentPath.includes(targetPath)) {
                link.classList.add('active-nav-tab');
            } else {
                link.classList.remove('active-nav-tab');
            }
        });`;

if (logic.includes(oldLogicStr)) {
    logic = logic.replace(oldLogicStr, newLogicStr);
    fs.writeFileSync('stitch/appLogic.js', logic, 'utf8');
} else {
    console.log("Could not find exact oldLogicStr, doing regex fallback");
    logic = logic.replace(/navLinks\.forEach\(link => \{[\s\S]*?\}\);/g, newLogicStr);
    fs.writeFileSync('stitch/appLogic.js', logic, 'utf8');
}
console.log('Fixed JS nav logic.');

// 2. Fix CSS text glitch globally
const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Remove the background clip and negative letter spacing from text
        const badTextCSS = `  /* Text Elegance */
  .text-primary, .text-secondary, .text-tertiary-fixed-dim, .text-\\[\\#002045\\], .header__title, h1, h2, h3, h4 {
    background: linear-gradient(to right, #e879f9, #22d3ee) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
    text-shadow: none !important;
  }`;

        const goodTextCSS = `  /* Text Elegance (Fixed for clarity) */
  .text-primary, .text-secondary, .text-tertiary-fixed-dim, .text-\\[\\#002045\\], .header__title, h1, h2, h3, h4 {
    color: #ffffff !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
    text-shadow: 0 2px 10px rgba(255,255,255,0.2) !important;
    background: none !important;
    -webkit-text-fill-color: initial !important;
  }`;

        html = html.replace(badTextCSS, goodTextCSS);
        
        // Update nav active tab css
        const badNavCSS = `nav a:hover, nav a.border-b-2 {
    background: rgba(255,255,255,0.1) !important;
    color: #f8fafc !important;
    border: none !important;
    box-shadow: 0 4px 15px rgba(255,255,255,0.05) !important;
  }`;
  
        const goodNavCSS = `nav a:hover, nav a.active-nav-tab {
    background: rgba(255,255,255,0.15) !important;
    color: #ffffff !important;
    border: none !important;
    box-shadow: 0 4px 15px rgba(255,255,255,0.1) !important;
    font-weight: 700 !important;
  }`;
  
        html = html.replace(badNavCSS, goodNavCSS);

        fs.writeFileSync(filePath, html, 'utf8');
    }
}
console.log('Fixed CSS globally.');
