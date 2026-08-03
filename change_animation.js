const fs = require('fs');
const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Change kinetic text to focus reveal
        html = html.replace(
            /@keyframes kineticReveal {[\s\S]*?}/,
            `@keyframes focusReveal {
    0% { opacity: 0; filter: blur(12px) brightness(2); transform: translateY(10px); }
    100% { opacity: 1; filter: blur(0) brightness(1); transform: translateY(0); }
  }`
        );
        html = html.replace(/animation: kineticReveal/g, 'animation: focusReveal');
        html = html.replace(/letter-spacing: 0\.5em;/g, ''); 
        
        // Change button border spin to sweeping shimmer
        const oldButtonCss = `button::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: conic-gradient(transparent, rgba(212,175,55,0.8), transparent 30%);
    animation: rotateBorder 4s linear infinite;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  @keyframes rotateBorder {
    100% { transform: rotate(360deg); }
  }`;

        const newButtonCss = `button::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: shimmerSweep 3s infinite;
    z-index: 1;
    pointer-events: none;
  }
  @keyframes shimmerSweep {
    0% { left: -100%; }
    50%, 100% { left: 200%; }
  }`;
  
        if (html.includes('rotateBorder')) {
            html = html.replace(oldButtonCss, newButtonCss);
        }
        
        fs.writeFileSync(filePath, html, 'utf8');
    }
}
console.log("Animations updated globally!");
