const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await pool.query('SELECT COUNT(*) as cnt FROM restaurants');
  console.log('Restaurants:', r.rows[0].cnt);
  
  const a = await pool.query('SELECT COUNT(*) as cnt FROM delivery_agents');
  console.log('Delivery Agents:', a.rows[0].cnt);
  
  const o = await pool.query('SELECT COUNT(*) as cnt FROM orders');
  console.log('Orders:', o.rows[0].cnt);

  // Check if online_order is boolean or string
  const sample = await pool.query('SELECT restaurant_id, name, online_order, rate, cuisines, location_neighborhood FROM restaurants LIMIT 3');
  console.log('\nSample restaurants:', JSON.stringify(sample.rows, null, 2));

  const agentSample = await pool.query('SELECT delivery_person_id, first_name, last_name, status, vehicle_type, ratings FROM delivery_agents LIMIT 3');
  console.log('\nSample agents:', JSON.stringify(agentSample.rows, null, 2));

  await pool.end();
}
check().catch(console.error);
