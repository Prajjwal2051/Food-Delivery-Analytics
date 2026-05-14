import {
  pgTable,
  varchar,
  numeric,
  integer,
  text,
  boolean,
  serial,
} from 'drizzle-orm/pg-core';

export const restaurants = pgTable('restaurants', {
  id: serial('id').primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url'),
  address: text('address'),
  locationNeighborhood: varchar('location_neighborhood', { length: 100 }),
  latitude: numeric('latitude', { precision: 10, scale: 6 }),
  longitude: numeric('longitude', { precision: 10, scale: 6 }),
  phone: varchar('phone', { length: 20 }),
  rate: numeric('rate', { precision: 3, scale: 1 }),
  votes: integer('votes').default(0),
  approxCostForTwo: integer('approx_cost_for_two'),
  restType: varchar('rest_type', { length: 50 }),
  cuisines: text('cuisines'),
  onlineOrder: boolean('online_order').default(false),
  bookTable: boolean('book_table').default(false),
  dishLiked: text('dish_liked'),
  listedInType: varchar('listed_in_type', { length: 50 }),
  listedInCity: varchar('listed_in_city', { length: 100 }),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
