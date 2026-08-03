const fs = require('fs');

let logic = fs.readFileSync('stitch/appLogic.js', 'utf8');

const newCode = `            viewMoreBtn.onclick = () => {
                const tbody = document.querySelector('table tbody');
                if (tbody) {
                    const mockMeds = [
                        'Ibuprofen 400mg', 'Atorvastatin 20mg', 'Omeprazole 20mg', 'Azithromycin 250mg', 
                        'Amlodipine 5mg', 'Sertraline 50mg', 'Simvastatin 40mg', 'Gabapentin 300mg',
                        'Losartan 50mg', 'Hydrochlorothiazide 25mg'
                    ];
                    for (let i = 0; i < 7; i++) {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-surface-container-low/50 animate-in fade-in';
                        tr.style.animationDelay = (i * 0.05) + 's';
                        tr.style.animationFillMode = 'both';
                        const medName = mockMeds[Math.floor(Math.random() * mockMeds.length)];
                        tr.innerHTML = \`
                            <td class="px-8 py-4 font-mono">2023-11-20</td>
                            <td class="px-8 py-4 font-medium">\${medName}</td>
                            <td class="px-8 py-4">\${Math.floor(Math.random() * 1000) + 50}</td>
                            <td class="px-8 py-4 text-right text-primary">
                                <span class="material-symbols-outlined cursor-pointer hover:text-cyan-400 mr-2 edit-row-btn">edit</span>
                                <span class="material-symbols-outlined cursor-pointer hover:text-red-400 delete-row-btn">delete</span>
                            </td>
                        \`;
                        tbody.appendChild(tr);
                        setupRowActions(tr);
                    }
                    viewMoreBtn.parentElement.style.display = 'none';
                }
            };`;

// Replace the existing onclick handler
logic = logic.replace(/viewMoreBtn\.onclick = \(\) => \{[\s\S]*?setupRowActions\(tr\);\r?\n                \}\r?\n            \};/, newCode);

fs.writeFileSync('stitch/appLogic.js', logic, 'utf8');
console.log('Fixed view more rows logic');
