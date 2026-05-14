/**
 * Utility script to seed an initial admin account.
 * Run once: npx ts-node src/scripts/createAdmin.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authAccounts } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await db
    .select()
    .from(authAccounts)
    .where(eq(authAccounts.username, username))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin account '${username}' already exists.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(authAccounts)
    .values({ username, passwordHash, role: 'admin' })
    .returning();

  console.log(`✅ Admin account created: username='${created.username}' role='${created.role}'`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
