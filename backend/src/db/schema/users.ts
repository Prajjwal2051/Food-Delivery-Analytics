import {
  pgTable,
  varchar,
  numeric,
  serial,
  date,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 10 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  defaultLatitude: numeric('default_latitude', { precision: 10, scale: 6 }),
  defaultLongitude: numeric('default_longitude', { precision: 10, scale: 6 }),
  city: varchar('city', { length: 100 }).default('Bengaluru'),
  locationArea: varchar('location_area', { length: 100 }),
  createdAt: date('created_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
