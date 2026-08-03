const fs = require('fs');

// 1. Update appState.js
let stateJs = `(function() {
    window.appState = {
        init: function() {
            if (!localStorage.getItem('medicines')) {
                localStorage.setItem('medicines', JSON.stringify([]));
            }
            if (!localStorage.getItem('users')) {
                // Initialize with Admin account
                localStorage.setItem('users', JSON.stringify([
                    {
                        name: 'System Admin',
                        email: 'admin@pharmacast.com',
                        username: 'admin',
                        password: 'admin',
                        role: 'Administrator',
                        date: new Date().toLocaleDateString(),
                        status: 'active'
                    }
                ]));
            }
            if (!localStorage.getItem('transactions')) {
                localStorage.setItem('transactions', JSON.stringify([]));
            }
        },
        getMedicines: () => JSON.parse(localStorage.getItem('medicines')),
        setMedicines: (data) => {
            localStorage.setItem('medicines', JSON.stringify(data));
        },
        getUsers: () => JSON.parse(localStorage.getItem('users')),
        setUsers: (data) => {
            localStorage.setItem('users', JSON.stringify(data));
        }
    };
    window.appState.init();
})();`;
fs.writeFileSync('stitch/appState.js', stateJs, 'utf8');


// 2. Update appLogic.js
let logic = fs.readFileSync('stitch/appLogic.js', 'utf8');

// Insert Auth Guard
const authGuard = `
    const protectedPages = ['admin_dashboard', 'manage_medicines', 'pharmacist_dashboard', 'pending_registration_approvals', 'upload_sales_data'];
    const isProtected = protectedPages.some(p => path.includes(p));
    if (isProtected && !sessionStorage.getItem('currentUser')) {
        window.location.href = '../login_page/code.html';
        return; // Stop execution
    }
`;
logic = logic.replace("const path = window.location.pathname;", "const path = window.location.pathname;\n" + authGuard);


// Replace Registration logic
const regLogicOld = `if (path.includes('registration_page')) {
        const form = document.querySelector('form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const inputs = form.querySelectorAll('input');
                const name = inputs[0]?.value;
                const email = inputs[1]?.value;
                const users = window.appState.getUsers();
                users.push({
                    name: name || 'New User',
                    email: email || 'test@test.com',
                    role: 'Pharmacist',
                    date: new Date().toLocaleDateString(),
                    status: 'pending'
                });
                window.appState.setUsers(users);
                alert('Registration submitted! You are now pending approval.');
                window.location.href = '../login_page/code.html';
            };
        }
    }`;
const regLogicNew = `if (path.includes('registration_page')) {
        const form = document.querySelector('form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const inputs = form.querySelectorAll('input');
                const name = inputs[0]?.value;
                const email = inputs[1]?.value;
                const username = inputs[3]?.value;
                const password = inputs[4]?.value;
                
                if(!name || !email || !username || !password) {
                    alert('Please fill out all fields.');
                    return;
                }
                
                const users = window.appState.getUsers();
                if (users.find(u => u.username === username || u.email === email)) {
                    alert('Username or Email already exists.');
                    return;
                }
                
                users.push({
                    name, email, username, password,
                    role: 'Pharmacist',
                    date: new Date().toLocaleDateString(),
                    status: 'pending'
                });
                window.appState.setUsers(users);
                alert('Registration submitted successfully! You must wait for an Admin to approve your account before you can log in.');
                window.location.href = '../login_page/code.html';
            };
        }
    }`;
if(logic.includes("if (path.includes('registration_page')) {")) {
    // We will use regex to replace the entire block
    logic = logic.replace(/if \(path\.includes\('registration_page'\)\) \{[\s\S]*?(?=if \(path\.includes\('login_page'\)\))/m, regLogicNew + '\n\n    ');
}


// Replace Login logic
const loginLogicNew = `if (path.includes('login_page')) {
        const form = document.querySelector('form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const inputs = form.querySelectorAll('input');
                const username = inputs[0]?.value;
                const password = inputs[1]?.value;
                
                const users = window.appState.getUsers();
                const user = users.find(u => (u.username === username || u.email === username) && u.password === password);
                
                if (user) {
                    if (user.status === 'active') {
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                        window.location.href = '../admin_dashboard/code.html';
                    } else if (user.status === 'pending') {
                        alert('Your account is still pending approval from an administrator.');
                    } else {
                        alert('Your account has been suspended or rejected.');
                    }
                } else {
                    alert('Invalid credentials. Please try again.');
                }
            };
        }
    }`;
logic = logic.replace(/if \(path\.includes\('login_page'\)\) \{[\s\S]*?(?=function renderHistory\(\))/m, loginLogicNew + '\n    \n    ');


// Replace Logout click to include sessionStorage clearing
logic = logic.replace(`onclick="window.location.href='../login_page/code.html'"`, `onclick="sessionStorage.removeItem('currentUser'); window.location.href='../login_page/code.html'"`);

fs.writeFileSync('stitch/appLogic.js', logic, 'utf8');
console.log('Authentication constraints successfully implemented!');
