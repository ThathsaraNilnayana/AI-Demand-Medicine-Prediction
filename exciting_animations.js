const fs = require('fs');

const dirs = fs.readdirSync('stitch');
for (const dir of dirs) {
    const filePath = `stitch/${dir}/code.html`;
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Fix Text Clarity (Remove blur, shadow, increase weight)
        html = html.replace(/font-weight: 200 !important;/g, 'font-weight: 500 !important;');
        html = html.replace(/text-shadow: 0 0 20px rgba\(255,255,255,0\.3\) !important;/g, 'text-shadow: none !important;');
        
        // Remove focusReveal animation and old kineticReveal
        html = html.replace(/@keyframes focusReveal \{[\s\S]*?\}/, '');
        html = html.replace(/animation: focusReveal[\s\S]*?;/, 'animation: flipReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;');
        html = html.replace(/animation: kineticReveal[\s\S]*?;/, 'animation: flipReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;');
        
        // Insert new flipReveal animation
        if (!html.includes('@keyframes flipReveal')) {
            html = html.replace('</style>', `
  @keyframes flipReveal {
    0% { opacity: 0; transform: perspective(400px) rotateX(90deg) translateY(-20px); }
    100% { opacity: 1; transform: perspective(400px) rotateX(0deg) translateY(0); }
  }
</style>`);
        }

        // Change button shimmerSweep to a crazy Neon Pulse
        const oldButtonCss = `button::before {
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

        const newButtonCss = `button::before {
    content: '';
    position: absolute;
    top: -5px; left: -5px; right: -5px; bottom: -5px;
    background: transparent;
    border: 2px solid rgba(212,175,55,0.8);
    border-radius: 12px;
    animation: neonPulse 1.5s infinite alternate;
    z-index: -1;
    pointer-events: none;
  }
  @keyframes neonPulse {
    0% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 10px rgba(212,175,55,0.2); }
    100% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 30px rgba(212,175,55,0.8); }
  }`;
  
        if (html.includes('shimmerSweep')) {
            html = html.replace(oldButtonCss, newButtonCss);
        } else if (html.includes('button::before')) {
            // in case old rotateBorder is still there somehow
            html = html.replace(/button::before \{[\s\S]*?\}/, newButtonCss.split('@keyframes')[0]);
            if(!html.includes('neonPulse')) html = html.replace('</style>', '@keyframes neonPulse { 0% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 10px rgba(212,175,55,0.2); } 100% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 30px rgba(212,175,55,0.8); } }</style>');
        }

        fs.writeFileSync(filePath, html, 'utf8');
    }
}
console.log("Exciting animations and crisp text applied globally!");
