const fs = require('fs');
let appLogic = fs.readFileSync('stitch/appLogic.js', 'utf8');

const physicsLogic = `
// ====================
// INTERACTIVE VOID PHYSICS
// ====================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cursor-spotlight')) return; // already added

    // 1. Create Spotlight
    const spotlight = document.createElement('div');
    spotlight.id = 'cursor-spotlight';
    document.body.appendChild(spotlight);

    // 2. Track Mouse for Spotlight & 3D Cards
    document.addEventListener('mousemove', (e) => {
        // Spotlight tracking
        spotlight.style.transform = \`translate(\${e.clientX}px, \${e.clientY}px)\`;

        // 3D Card Tilt Physics
        const cards = document.querySelectorAll('.bg-surface-container-lowest, .bg-surface-container-low, .bg-surface-container, .bg-surface-container-high, .bg-primary-container, .bg-surface, .card');
        
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // Check if mouse is inside the card
            if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
                // Calculate position relative to center of card (-1 to 1)
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                
                // Max rotation in degrees
                const maxRotation = 10;
                const rotX = y * -maxRotation; 
                const rotY = x * maxRotation;
                
                card.style.transform = \`perspective(1000px) rotateX(\${rotX}deg) rotateY(\${rotY}deg) scale3d(1.02, 1.02, 1.02)\`;
                card.style.borderColor = 'rgba(212,175,55,0.4)';
            } else {
                // Reset card
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
                card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
        });
    });
});
`;

if (!appLogic.includes('INTERACTIVE VOID PHYSICS')) {
    fs.writeFileSync('stitch/appLogic.js', appLogic + '\n' + physicsLogic, 'utf8');
    console.log("Injected physics logic!");
} else {
    console.log("Physics logic already present.");
}
