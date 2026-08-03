const fs = require('fs');

let stateJs = `(function() {
    window.appState = {
        init: function() {
            if (!localStorage.getItem('medicines')) {
                localStorage.setItem('medicines', JSON.stringify([]));
            }
            if (!localStorage.getItem('transactions')) {
                localStorage.setItem('transactions', JSON.stringify([]));
            }
            
            let users = [];
            if (localStorage.getItem('users')) {
                try {
                    users = JSON.parse(localStorage.getItem('users'));
                } catch(e) {}
            }
            
            // Ensure Admin exists
            const adminExists = users.find(u => u.username === 'admin' || u.email === 'admin@pharmacast.com');
            if (!adminExists) {
                users.push({
                    name: 'System Admin',
                    email: 'admin@pharmacast.com',
                    username: 'admin',
                    password: 'admin',
                    role: 'Administrator',
                    date: new Date().toLocaleDateString(),
                    status: 'active'
                });
                localStorage.setItem('users', JSON.stringify(users));
            } else if (!localStorage.getItem('users')) {
                localStorage.setItem('users', JSON.stringify(users));
            }
        },
        getMedicines: () => JSON.parse(localStorage.getItem('medicines') || '[]'),
        setMedicines: (data) => {
            localStorage.setItem('medicines', JSON.stringify(data));
        },
        getUsers: () => JSON.parse(localStorage.getItem('users') || '[]'),
        setUsers: (data) => {
            localStorage.setItem('users', JSON.stringify(data));
        }
    };
    window.appState.init();
})();`;
fs.writeFileSync('stitch/appState.js', stateJs, 'utf8');
console.log('Fixed appState.js to force admin injection');
