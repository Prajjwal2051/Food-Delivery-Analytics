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
  // Raised from 2 s → 10 s so heavy analytical queries don't time out
  // while waiting for an available connection from the pool.
  connectionTimeoutMillis: 10000,
  // Raised from 30 s → 60 s to keep idle connections alive longer.
  idleTimeoutMillis: 60000,
  // Keep TCP sockets alive so the OS doesn't silently drop them after
  // a period of inactivity (prevents 'Connection terminated unexpectedly').
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
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
