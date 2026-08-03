#!/usr/bin/env node

/**
 * Quick test to verify PharmaCast API is working
 * Run: node test-api.js
 */

async function testAPI() {
    const BASE_URL = 'http://localhost:3000/api';
    
    console.log('\n🧪 Testing PharmaCast API Endpoints...\n');
    
    try {
        // Test 1: Get all medicines
        console.log('1️⃣  Testing GET /api/medicines...');
        let response = await fetch(`${BASE_URL}/medicines`);
        let data = await response.json();
        console.log(`   ✅ Found ${data.length} medicines`);
        
        // Test 2: Get dashboard stats
        console.log('\n2️⃣  Testing GET /api/stats...');
        response = await fetch(`${BASE_URL}/stats`);
        data = await response.json();
        console.log(`   ✅ Dashboard Stats:`);
        console.log(`      • Total Medicines: ${data.totalMedicines}`);
        console.log(`      • Total Stock: ${data.totalStock}`);
        console.log(`      • Low Stock Items: ${data.lowStockItems}`);
        console.log(`      • Pending Approvals: ${data.pendingApprovals}`);
        
        // Test 3: Get stock levels
        console.log('\n3️⃣  Testing GET /api/stock...');
        response = await fetch(`${BASE_URL}/stock`);
        data = await response.json();
        console.log(`   ✅ Retrieved ${data.length} stock records`);
        
        // Test 4: Get predictions
        console.log('\n4️⃣  Testing GET /api/predictions...');
        response = await fetch(`${BASE_URL}/predictions`);
        data = await response.json();
        console.log(`   ✅ Retrieved ${data.length} predictions`);
        
        // Test 5: Get users
        console.log('\n5️⃣  Testing GET /api/users...');
        response = await fetch(`${BASE_URL}/users`);
        data = await response.json();
        console.log(`   ✅ Found ${data.length} users`);
        data.forEach(u => console.log(`      • ${u.username} (${u.role}) - ${u.status}`));
        
        console.log('\n✅ All tests passed! API is working correctly.\n');
        
    } catch (error) {
        console.error('\n❌ Error testing API:', error.message);
        console.error('\n⚠️  Make sure the server is running:');
        console.error('   cd "e:\\Group project\\stitch"');
        console.error('   node server.js\n');
        process.exit(1);
    }
}

testAPI();
