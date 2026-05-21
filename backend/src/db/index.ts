import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as restaurants from './schema/restaurants';
import * as users from './schema/users';
import * as deliveryAgents from './schema/delivery_agents';
import * as orders from './schema/orders';
import * as auth from './schema/auth';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  // Removed connectionTimeoutMillis or increased to let network fallback work
  connectionTimeoutMillis: 0,
  // Reduced to 10s to prevent Supabase PgBouncer dropping idle connections quietly
  idleTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Catch pool errors to prevent application crashes
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, {
  schema: {
    ...restaurants,
    ...users,
    ...deliveryAgents,
    ...orders,
    ...auth,
  },
});

export type DB = typeof db;
