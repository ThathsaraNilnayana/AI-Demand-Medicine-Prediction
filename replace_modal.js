const fs = require('fs');

const modalCode = `window.addMedicine = () => {
    if (document.getElementById('add-med-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'add-med-modal';
    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    modal.style.background = 'rgba(0, 0, 0, 0.5)';
    modal.style.backdropFilter = 'blur(10px)';
    
    modal.innerHTML = \`
        <div class="bg-surface-container-lowest p-8 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-md transform scale-95 transition-all duration-300" id="add-med-box" style="background: rgba(15, 23, 42, 0.85) !important; backdrop-filter: blur(24px) !important;">
            <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 class="text-2xl font-bold text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-cyan-400">medication</span>
                    New Medicine
                </h3>
                <button type="button" class="text-gray-400 hover:text-white transition-colors p-1" onclick="document.getElementById('add-med-modal').remove()">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form id="add-med-form" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Medicine Name</label>
                    <input type="text" id="med-name" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="e.g. Amoxicillin">
                </div>
                
                <div class="grid grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Category</label>
                        <input type="text" id="med-category" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="e.g. Antibiotic">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Stock Qty</label>
                        <input type="number" id="med-stock" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none shadow-inner" placeholder="0">
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Description</label>
                    <textarea id="med-desc" required class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none resize-none shadow-inner" rows="2" placeholder="Brief description..."></textarea>
                </div>
                
                <button type="submit" class="w-full mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg shadow-cyan-500/40 transform transition-all active:scale-95 border border-cyan-400/30">
                    Save Medicine
                </button>
            </form>
        </div>
    \`;

    document.body.appendChild(modal);
    
    // Animate in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('add-med-box').classList.remove('scale-95');
        document.getElementById('med-name').focus();
    });

    document.getElementById('add-med-form').onsubmit = (e) => {
        e.preventDefault();
        
        const name = document.getElementById('med-name').value;
        const category = document.getElementById('med-category').value;
        const stock = document.getElementById('med-stock').value;
        const desc = document.getElementById('med-desc').value;
        
        const meds = window.appState.getMedicines();
        meds.push({
            id: 'PC-' + Math.floor(Math.random() * 10000),
            name, desc, category, stock,
            updated: new Date().toLocaleDateString()
        });
        window.appState.setMedicines(meds);
        renderMedicines();
        
        // Animate out
        modal.classList.add('opacity-0');
        document.getElementById('add-med-box').classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    };
};`;

let logic = fs.readFileSync('stitch/appLogic.js', 'utf8');

// Replace the old addMedicine function
logic = logic.replace(/window\.addMedicine = \(\) => \{[\s\S]*?renderMedicines\(\);\r?\n    \};/m, modalCode);

fs.writeFileSync('stitch/appLogic.js', logic, 'utf8');
console.log('Modal injected!');
