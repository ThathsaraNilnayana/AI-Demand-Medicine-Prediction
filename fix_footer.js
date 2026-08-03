const fs = require('fs');

const extraLogic = `
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.innerHTML = \`
        footer {
            background: rgba(15, 23, 42, 0.6) !important;
            backdrop-filter: blur(20px) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        footer span, footer a {
            color: #94a3b8 !important;
            transition: color 0.2s !important;
        }
        footer a:hover {
            color: #38bdf8 !important;
        }
        footer span.font-bold, footer .brand {
            color: #e2e8f0 !important;
        }
    \`;
    document.head.appendChild(style);
});
`;

fs.appendFileSync('stitch/appLogic.js', extraLogic, 'utf8');
console.log('Fixed footer styling globally');
