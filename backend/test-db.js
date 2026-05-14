const { Client } = require('pg');

async function checkConnection(user, password, database) {
  const client = new Client({
    user,
    host: 'localhost',
    database,
    password,
    port: 5432,
  });
  try {
    await client.connect();
    console.log(`✅ Success: ${user}:${password}@${database}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${user}:${password}@${database} - ${err.message}`);
    return false;
  }
}

async function testAll() {
  const users = ['postgres', 'root', 'prajjwal', 'admin'];
  const passwords = ['', 'postgres', 'root', 'password', '123456', 'prajjwal'];
  const databases = ['postgres', 'food_delivery_analytics', 'template1'];
  
  for (const user of users) {
    for (const password of passwords) {
      for (const database of databases) {
        const ok = await checkConnection(user, password, database);
        if (ok) return;
      }
    }
  }
}

testAll();
