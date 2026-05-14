const { Client } = require('pg');

async function testPeer() {
  const users = ['postgres', 'prajjwal', 'root', 'admin'];
  const dirs = ['/var/run/postgresql', '/tmp'];
  
  for (const host of dirs) {
    for (const user of users) {
      const client = new Client({
        user,
        host,
        database: 'postgres',
      });
      try {
        await client.connect();
        console.log(`✅ Success via socket ${host} as ${user}`);
        await client.end();
      } catch (err) {
        console.log(`❌ Failed socket ${host} as ${user}: ${err.message}`);
      }
    }
  }
}

testPeer();
