const fs = require('fs');
const extraLogic = `
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Navigation Highlighting
    const navLinks = document.querySelectorAll('nav .hidden.md\\\\:flex a, nav div.hidden.md\\\\:flex a, nav div.md\\\\:flex a');
    if (navLinks.length > 0) {
        const currentPath = window.location.pathname;
        
        navLinks.forEach(link => {
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
        });
    }
});
`;

fs.appendFileSync('stitch/appLogic.js', extraLogic, 'utf8');
console.log('Appended dynamic navigation highlighting logic!');
