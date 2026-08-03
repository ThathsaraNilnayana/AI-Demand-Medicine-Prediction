const fs = require('fs');

// 1. Inject Shake CSS
const shakeCss = `
  /* Hyper Shake Interactive Glitch */
  body.hyper-shake {
    filter: hue-rotate(90deg) contrast(150%) saturate(200%) !important;
  }
  
  body.hyper-shake #cursor-spotlight {
    transform: translate(-50%, -50%) scale(5) !important;
    background: radial-gradient(circle, rgba(255,0,255,0.9) 0%, rgba(0,255,255,0.7) 40%, transparent 80%) !important;
    transition: transform 0.1s ease-out, background 0.1s !important;
  }
  
  body.hyper-shake .bg-surface-container-lowest, 
  body.hyper-shake .card,
  body.hyper-shake .bg-surface,
  body.hyper-shake .bg-primary-container {
    border-color: #ff00ff !important;
    box-shadow: 0 0 50px #ff00ff, inset 0 0 30px #00ffff !important;
    animation: violentShake 0.1s infinite !important;
  }
  
  @keyframes violentShake {
    0% { transform: perspective(1000px) rotateX(5deg) rotateY(-5deg) scale3d(1.05, 1.05, 1.05); }
    50% { transform: perspective(1000px) rotateX(-5deg) rotateY(5deg) scale3d(1.05, 1.05, 1.05); }
    100% { transform: perspective(1000px) rotateX(5deg) rotateY(-5deg) scale3d(1.05, 1.05, 1.05); }
  }
</style>
`;

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        if (!html.includes('hyper-shake')) {
            html = html.replace('</style>', shakeCss);
            fs.writeFileSync(filePath, html, 'utf8');
        }
    }
}

// 2. Inject Shake Logic into appLogic.js
let appLogic = fs.readFileSync('stitch/appLogic.js', 'utf8');
const shakeLogic = `
// ====================
// SHAKE CURSOR DETECTOR
// ====================
let shakeHistory = [];
document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    shakeHistory.push({x: e.clientX, y: e.clientY, time: now});
    // Keep only last 300ms
    shakeHistory = shakeHistory.filter(h => now - h.time < 300);
    
    let totalDist = 0;
    let reversals = 0;
    let lastDir = 0; 
    
    for(let i=1; i<shakeHistory.length; i++) {
        let dx = shakeHistory[i].x - shakeHistory[i-1].x;
        totalDist += Math.abs(dx) + Math.abs(shakeHistory[i].y - shakeHistory[i-1].y);
        
        let dir = Math.sign(dx);
        // Only count distinct direction changes (ignoring 0)
        if (dir !== 0 && lastDir !== 0 && dir !== lastDir) reversals++;
        if (dir !== 0) lastDir = dir;
    }
    
    // If moved a lot (1000px) and reversed direction at least twice in 300ms -> user is shaking cursor!
    if (totalDist > 800 && reversals >= 2) {
        if (!document.body.classList.contains('hyper-shake')) {
            document.body.classList.add('hyper-shake');
            
            // Turn off shake after 1.5 seconds
            setTimeout(() => {
                document.body.classList.remove('hyper-shake');
            }, 1500);
        }
    }
});
`;

if (!appLogic.includes('SHAKE CURSOR DETECTOR')) {
    fs.writeFileSync('stitch/appLogic.js', appLogic + '\n' + shakeLogic, 'utf8');
}
console.log("Shake animation injected!");
