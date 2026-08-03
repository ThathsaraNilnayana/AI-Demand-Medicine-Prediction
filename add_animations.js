const fs = require('fs');

const cssToAdd = `
  /* Unique Page Animations */
  @keyframes slideInFromRight {
    0% { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes zoomInSmooth {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes fadeDrop {
    0% { opacity: 0; transform: translateY(-20px) scale(1.02); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  main.anim-float > * { animation: elegantFloatUp 1s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  main.anim-slide > * { animation: slideInFromRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  main.anim-zoom > * { animation: zoomInSmooth 1s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  main.anim-drop > * { animation: fadeDrop 0.8s cubic-bezier(0.16, 1, 0.3, 1) both !important; }
  
  table tbody tr { animation-delay: inherit !important; }
  main.anim-float table tbody tr:nth-child(1) { animation-delay: 0.1s !important; }
  main.anim-float table tbody tr:nth-child(2) { animation-delay: 0.15s !important; }
  main.anim-float table tbody tr:nth-child(3) { animation-delay: 0.2s !important; }
`;

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Remove the hardcoded main > * animation
        html = html.replace(/main > \* { animation: elegantFloatUp[^}]+}/g, '');
        
        if (!html.includes('anim-slide') && html.includes('universal-colorful-theme')) {
            html = html.replace('</style>', cssToAdd + '\n</style>');
            fs.writeFileSync(filePath, html, 'utf8');
        }
    }
}
console.log('CSS Animations injected.');

// Now append logic to appLogic.js
let js = fs.readFileSync('stitch/appLogic.js', 'utf8');
const randomAnimLogic = `
// Random Page Entrance Animation
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (main) {
        const anims = ['anim-float', 'anim-slide', 'anim-zoom', 'anim-drop'];
        const chosenAnim = anims[Math.floor(Math.random() * anims.length)];
        main.classList.add(chosenAnim);
    }
    
    // Add page transition exit animation on clicks
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', (e) => {
            const href = el.getAttribute('href') || (el.onclick ? el.onclick.toString() : '');
            if (href && href.includes('code.html') && !el.closest('form')) {
                // Ignore if it's already handled by our router map in code.html
                // Actually, just let it be. But we can fade out the body
                document.body.style.transition = 'opacity 0.3s ease';
                document.body.style.opacity = '0';
            }
        });
    });
});
`;

if (!js.includes('Random Page Entrance Animation')) {
    fs.writeFileSync('stitch/appLogic.js', js + '\n' + randomAnimLogic, 'utf8');
}
console.log('JS Logic injected.');
