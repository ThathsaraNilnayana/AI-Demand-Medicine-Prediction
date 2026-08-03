const fs = require('fs');

const extraLogic = `
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('upload_sales_data')) {
        // 1. Export Logs Button
        const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Logs'));
        if (exportBtn) {
            exportBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = 'data:text/csv;charset=utf-8,Date,Medicine,Quantity\\n2023-11-24,Amoxicillin,420\\n2023-11-24,Lisinopril,1250';
                a.download = 'sales_logs_export.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Show a nice modal instead of alert
                const msg = document.createElement('div');
                msg.className = 'fixed top-4 right-4 bg-tertiary-fixed text-on-tertiary-fixed px-6 py-4 rounded-xl shadow-2xl z-[99999] font-bold flex items-center gap-3 animate-in slide-in-from-top-10 fade-in';
                msg.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Export Downloaded!';
                document.body.appendChild(msg);
                setTimeout(() => {
                    msg.classList.add('fade-out', 'slide-out-to-top-10');
                    setTimeout(() => msg.remove(), 300);
                }, 3000);
            };
        }

        // 2. File Upload Handling
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    
                    // Show processing toast
                    const msg = document.createElement('div');
                    msg.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-primary px-8 py-4 rounded-full shadow-2xl z-[99999] font-bold flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in';
                    msg.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Processing ' + file.name;
                    document.body.appendChild(msg);
                    
                    // Add to Ingestion Log dynamically
                    const logContainers = document.querySelectorAll('.bg-surface-container-lowest.clinical-shadow .space-y-0');
                    if (logContainers.length > 0) {
                        const logContainer = logContainers[logContainers.length - 1];
                        const newLog = document.createElement('div');
                        newLog.className = 'flex items-center justify-between p-6 hover:bg-surface-container-low transition-colors group animate-in fade-in slide-in-from-top-4 duration-500';
                        newLog.innerHTML = \`
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-secondary-container/20 rounded flex items-center justify-center text-secondary">
                                    <span class="material-symbols-outlined">table_view</span>
                                </div>
                                <div>
                                    <div class="font-bold text-primary">\${file.name}</div>
                                    <div class="text-xs text-on-surface-variant">Uploaded just now by You</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-bold text-primary">Pending...</div>
                                <span class="bg-secondary-container text-on-secondary-container text-[10px] font-black px-2 py-0.5 rounded">PROCESSING</span>
                            </div>
                        \`;
                        logContainer.prepend(newLog);
                        
                        setTimeout(() => {
                            newLog.querySelector('.text-right .text-sm').textContent = (Math.floor(Math.random() * 5000) + 100).toLocaleString() + ' Records';
                            const badge = newLog.querySelector('.bg-secondary-container');
                            badge.className = 'bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-black px-2 py-0.5 rounded';
                            badge.textContent = 'SUCCESS';
                            
                            msg.innerHTML = '<span class="material-symbols-outlined text-green-500">task_alt</span> Upload Complete!';
                            setTimeout(() => {
                                msg.style.opacity = '0';
                                setTimeout(() => msg.remove(), 300);
                            }, 2000);
                        }, 2000);
                    }
                    
                    // Update Staging Preview filename
                    const stagingTitle = document.querySelector('.px-8.py-6.border-b h3 + p span');
                    if (stagingTitle) stagingTitle.textContent = file.name;
                    
                    // Add a new mock row to staging
                    const tbody = document.querySelector('table tbody');
                    if (tbody) {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-surface-container-low/50 animate-in fade-in bg-cyan-500/10';
                        tr.innerHTML = \`
                            <td class="px-8 py-4 font-mono">\${new Date().toISOString().split('T')[0]}</td>
                            <td class="px-8 py-4 font-medium">New Uploaded Entry</td>
                            <td class="px-8 py-4">\${Math.floor(Math.random() * 1000)}</td>
                            <td class="px-8 py-4 text-right text-primary"><span class="material-symbols-outlined cursor-pointer delete-row-btn hover:text-red-400">delete</span></td>
                        \`;
                        tbody.prepend(tr);
                        setupRowActions(tr);
                    }
                }
            };
        }

        // 3. View more rows
        const viewMoreBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View'));
        if (viewMoreBtn) {
            viewMoreBtn.onclick = () => {
                const tbody = document.querySelector('table tbody');
                if (tbody) {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-surface-container-low/50 animate-in fade-in';
                    tr.innerHTML = \`
                        <td class="px-8 py-4 font-mono">2023-11-20</td>
                        <td class="px-8 py-4 font-medium">Ibuprofen 400mg</td>
                        <td class="px-8 py-4">\${Math.floor(Math.random() * 1000)}</td>
                        <td class="px-8 py-4 text-right text-primary">
                            <span class="material-symbols-outlined cursor-pointer hover:text-cyan-400 mr-2 edit-row-btn">edit</span>
                            <span class="material-symbols-outlined cursor-pointer hover:text-red-400 delete-row-btn">delete</span>
                        </td>
                    \`;
                    tbody.appendChild(tr);
                    setupRowActions(tr);
                }
            };
        }
        
        // 4. Edit/Delete initial rows
        function setupRowActions(parent) {
            parent.querySelectorAll('.material-symbols-outlined').forEach(icon => {
                // If it's an edit icon
                if (icon.textContent === 'edit' || icon.classList.contains('edit-row-btn')) {
                    icon.onclick = (e) => {
                        const row = e.target.closest('tr');
                        const qtyCell = row.querySelectorAll('td')[2];
                        const newQty = prompt('Enter new quantity:', qtyCell.textContent.trim());
                        if(newQty) qtyCell.textContent = newQty;
                    };
                }
                // If it's a delete icon
                if (icon.textContent === 'delete' || icon.classList.contains('delete-row-btn')) {
                    icon.onclick = (e) => {
                        e.target.closest('tr').style.opacity = '0';
                        setTimeout(() => e.target.closest('tr').remove(), 300);
                    };
                }
            });
        }
        setupRowActions(document.querySelector('table tbody'));
    }
});
`;

fs.appendFileSync('stitch/appLogic.js', extraLogic, 'utf8');
console.log('Appended data management logic!');
