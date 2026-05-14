import {
  pgTable,
  varchar,
  numeric,
  integer,
  serial,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'motorcycle',
  'scooter',
  'electric_scooter',
  'bicycle',
]);

export const agentStatusEnum = pgEnum('agent_status', [
  'Available',
  'On Delivery',
  'Offline',
]);

export const deliveryAgents = pgTable('delivery_agents', {
  id: serial('id').primaryKey(),
  deliveryPersonId: varchar('delivery_person_id', { length: 10 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  age: integer('age'),
  ratings: numeric('ratings', { precision: 3, scale: 2 }),
  vehicleType: vehicleTypeEnum('vehicle_type'),
  vehicleCondition: integer('vehicle_condition').default(1),
  status: agentStatusEnum('status').default('Available'),
  currentLatitude: numeric('current_latitude', { precision: 10, scale: 6 }),
  currentLongitude: numeric('current_longitude', { precision: 10, scale: 6 }),
  totalDeliveries: integer('total_deliveries').default(0),
  city: varchar('city', { length: 100 }).default('Bengaluru'),
});

export type DeliveryAgent = typeof deliveryAgents.$inferSelect;
export type NewDeliveryAgent = typeof deliveryAgents.$inferInsert;
