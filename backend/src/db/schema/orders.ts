import {
  pgTable,
  varchar,
  numeric,
  integer,
  boolean,
  serial,
  date,
  time,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { restaurants } from './restaurants';
import { users } from './users';
import { deliveryAgents } from './delivery_agents';

export const weatherEnum = pgEnum('weather_conditions', [
  'Sunny', 'Cloudy', 'Rainy', 'Foggy', 'Windy', 'Stormy',
]);

export const trafficEnum = pgEnum('road_traffic_density', [
  'Low', 'Medium', 'High', 'Jam',
]);

export const orderTypeEnum = pgEnum('order_type', [
  'Snack', 'Meal', 'Drinks', 'Buffet',
]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id', { length: 15 }).notNull().unique(),

  // Foreign Keys
  restaurantId: varchar('restaurant_id', { length: 10 })
    .notNull()
    .references(() => restaurants.restaurantId),
  deliveryPersonId: varchar('delivery_person_id', { length: 10 })
    .notNull()
    .references(() => deliveryAgents.deliveryPersonId),
  userId: varchar('user_id', { length: 10 })
    .notNull()
    .references(() => users.userId),

  // Location snapshot at time of order
  restaurantLatitude: numeric('restaurant_latitude', { precision: 10, scale: 6 }),
  restaurantLongitude: numeric('restaurant_longitude', { precision: 10, scale: 6 }),
  deliveryLocationLatitude: numeric('delivery_location_latitude', { precision: 10, scale: 6 }),
  deliveryLocationLongitude: numeric('delivery_location_longitude', { precision: 10, scale: 6 }),

  // Timing
  orderDate: date('order_date'),
  timeOrdered: time('time_ordered'),
  timeOrderPicked: time('time_order_picked'),
  timeTakenMin: integer('time_taken_min'),

  // Conditions
  weatherConditions: weatherEnum('weather_conditions'),
  roadTrafficDensity: trafficEnum('road_traffic_density'),
  vehicleCondition: integer('vehicle_condition'),
  typeOfOrder: orderTypeEnum('type_of_order'),
  typeOfVehicle: varchar('type_of_vehicle', { length: 20 }),
  multipleDeliveries: integer('multiple_deliveries').default(0),
  festival: boolean('festival').default(false),
  city: varchar('city', { length: 100 }).default('Bengaluru'),
});

// Relations
export const ordersRelations = relations(orders, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.restaurantId],
  }),
  deliveryAgent: one(deliveryAgents, {
    fields: [orders.deliveryPersonId],
    references: [deliveryAgents.deliveryPersonId],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.userId],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
