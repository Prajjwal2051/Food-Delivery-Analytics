import { db } from '../db';
import { restaurants } from '../db/schema/restaurants';
import { deliveryAgents } from '../db/schema/delivery_agents';
import { users } from '../db/schema/users';
import { orders } from '../db/schema/orders';
import * as fs from 'fs';
import * as path from 'path';

// CSV parser - handles quoted fields with commas inside
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || '').trim();
    });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const ASSETS = '/home/prajjwal/Desktop/Coding/RideShare/Assets';

async function seedRestaurants() {
  const content = fs.readFileSync(path.join(ASSETS, 'restaurants.csv'), 'utf-8');
  const rows = parseCSV(content);
  let count = 0;
  const batch: typeof rows = [];
  for (const row of rows) {
    batch.push(row);
    if (batch.length === 50) {
      await flushRestaurants(batch);
      count += batch.length;
      batch.length = 0;
      process.stdout.write(`\r  Restaurants: ${count}/${rows.length}`);
    }
  }
  if (batch.length > 0) {
    await flushRestaurants(batch);
    count += batch.length;
  }
  console.log(`\r  ✅ Restaurants: ${count} inserted`);
}

async function flushRestaurants(rows: Record<string, string>[]) {
  const values = rows.map(r => ({
    restaurantId: r.restaurant_id,
    name: r.name,
    url: r.url || null,
    address: r.address || null,
    locationNeighborhood: r.location_neighborhood || null,
    latitude: r.latitude || null,
    longitude: r.longitude || null,
    phone: r.phone || null,
    rate: r.rate || null,
    votes: r.votes ? parseInt(r.votes) : 0,
    approxCostForTwo: r.approx_cost_for_two ? parseInt(r.approx_cost_for_two) : null,
    restType: r.rest_type || null,
    cuisines: r.cuisines || null,
    onlineOrder: r.online_order === 'Yes' ? true : false,
    bookTable: r.book_table === 'Yes' ? true : false,
    dishLiked: r.dish_liked || null,
    listedInType: r.listed_in_type || null,
    listedInCity: r.listed_in_city || null,
  }));
  await db.insert(restaurants).values(values).onConflictDoNothing();
}

async function seedAgents() {
  const content = fs.readFileSync(path.join(ASSETS, 'delivery_agents.csv'), 'utf-8');
  const rows = parseCSV(content);
  let count = 0;

  const VALID_VEHICLE = ['motorcycle', 'scooter', 'electric_scooter', 'bicycle'];
  const VALID_STATUS = ['Available', 'On Delivery', 'Offline'];

  const batch: typeof rows = [];
  for (const row of rows) {
    batch.push(row);
    if (batch.length === 100) {
      await flushAgents(batch, VALID_VEHICLE, VALID_STATUS);
      count += batch.length;
      batch.length = 0;
      process.stdout.write(`\r  Agents: ${count}/${rows.length}`);
    }
  }
  if (batch.length > 0) {
    await flushAgents(batch, VALID_VEHICLE, VALID_STATUS);
    count += batch.length;
  }
  console.log(`\r  ✅ Agents: ${count} inserted`);
}

async function flushAgents(rows: Record<string, string>[], validVehicles: string[], validStatuses: string[]) {
  const values = rows.map(r => ({
    deliveryPersonId: r.delivery_person_id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone || null,
    age: r.age ? parseInt(r.age) : null,
    ratings: r.ratings || null,
    vehicleType: (validVehicles.includes(r.vehicle_type) ? r.vehicle_type : 'motorcycle') as 'motorcycle' | 'scooter' | 'electric_scooter' | 'bicycle',
    vehicleCondition: r.vehicle_condition ? parseInt(r.vehicle_condition) : 1,
    status: (validStatuses.includes(r.status) ? r.status : 'Available') as 'Available' | 'On Delivery' | 'Offline',
    currentLatitude: r.current_latitude || null,
    currentLongitude: r.current_longitude || null,
    totalDeliveries: r.total_deliveries ? parseInt(r.total_deliveries) : 0,
    city: r.city || 'Bengaluru',
  }));
  await db.insert(deliveryAgents).values(values).onConflictDoNothing();
}

async function seedUsers() {
  const content = fs.readFileSync(path.join(ASSETS, 'users.csv'), 'utf-8');
  const rows = parseCSV(content);
  let count = 0;

  const batch: typeof rows = [];
  for (const row of rows) {
    batch.push(row);
    if (batch.length === 200) {
      await flushUsers(batch);
      count += batch.length;
      batch.length = 0;
      process.stdout.write(`\r  Users: ${count}/${rows.length}`);
    }
  }
  if (batch.length > 0) {
    await flushUsers(batch);
    count += batch.length;
  }
  console.log(`\r  ✅ Users: ${count} inserted`);
}

async function flushUsers(rows: Record<string, string>[]) {
  const values = rows.map(r => ({
    userId: r.user_id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone || null,
    defaultLatitude: r.default_latitude || null,
    defaultLongitude: r.default_longitude || null,
    city: r.city || 'Bengaluru',
    locationArea: r.location_area || null,
    createdAt: r.created_at || null,
  }));
  await db.insert(users).values(values).onConflictDoNothing();
}

async function seedOrders() {
  const content = fs.readFileSync(path.join(ASSETS, 'orders.csv'), 'utf-8');
  const rows = parseCSV(content);
  let count = 0;
  let skipped = 0;

  const VALID_WEATHER = ['Sunny', 'Cloudy', 'Rainy', 'Foggy', 'Windy', 'Stormy'];
  const VALID_TRAFFIC = ['Low', 'Medium', 'High', 'Jam'];
  const VALID_ORDER_TYPE = ['Snack', 'Meal', 'Drinks', 'Buffet'];

  const batch: typeof rows = [];
  for (const row of rows) {
    batch.push(row);
    if (batch.length === 500) {
      const res = await flushOrders(batch, VALID_WEATHER, VALID_TRAFFIC, VALID_ORDER_TYPE);
      count += res.inserted;
      skipped += res.skipped;
      batch.length = 0;
      process.stdout.write(`\r  Orders: ${count} inserted, ${skipped} skipped`);
    }
  }
  if (batch.length > 0) {
    const res = await flushOrders(batch, VALID_WEATHER, VALID_TRAFFIC, VALID_ORDER_TYPE);
    count += res.inserted;
    skipped += res.skipped;
  }
  console.log(`\r  ✅ Orders: ${count} inserted, ${skipped} skipped/conflict`);
}

async function flushOrders(rows: Record<string, string>[], validWeather: string[], validTraffic: string[], validOrderType: string[]) {
  const values = rows.map(r => ({
    orderId: r.order_id,
    restaurantId: r.restaurant_id,
    deliveryPersonId: r.delivery_person_id,
    userId: r.user_id,
    restaurantLatitude: r.restaurant_latitude || null,
    restaurantLongitude: r.restaurant_longitude || null,
    deliveryLocationLatitude: r.delivery_location_latitude || null,
    deliveryLocationLongitude: r.delivery_location_longitude || null,
    orderDate: r.order_date || null,
    timeOrdered: r.time_ordered || null,
    timeOrderPicked: r.time_order_picked || null,
    timeTakenMin: r.time_taken_min ? parseInt(r.time_taken_min) : null,
    weatherConditions: (validWeather.includes(r.weather_conditions) ? r.weather_conditions : 'Sunny') as any,
    roadTrafficDensity: (validTraffic.includes(r.road_traffic_density) ? r.road_traffic_density : 'Medium') as any,
    vehicleCondition: r.vehicle_condition ? parseInt(r.vehicle_condition) : 1,
    typeOfOrder: (validOrderType.includes(r.type_of_order) ? r.type_of_order : 'Meal') as any,
    typeOfVehicle: r.type_of_vehicle || null,
    multipleDeliveries: r.multiple_deliveries ? parseInt(r.multiple_deliveries) : 0,
    festival: r.festival === 'Yes' ? true : false,
    city: r.city || 'Bengaluru',
  }));
  try {
    await db.insert(orders).values(values).onConflictDoNothing();
    return { inserted: values.length, skipped: 0 };
  } catch (e) {
    // Insert one by one on error
    let ins = 0, skip = 0;
    for (const v of values) {
      try {
        await db.insert(orders).values(v).onConflictDoNothing();
        ins++;
      } catch { skip++; }
    }
    return { inserted: ins, skipped: skip };
  }
}

async function seed() {
  console.log('🌱 Seeding database from CSV assets...\n');

  // Clear existing data first
  console.log('🗑️  Clearing existing data...');
  await db.delete(orders);
  await db.delete(deliveryAgents);
  await db.delete(users);
  await db.delete(restaurants);
  console.log('  ✅ Tables cleared\n');

  console.log('📍 Inserting restaurants...');
  await seedRestaurants();

  console.log('👤 Inserting users...');
  await seedUsers();

  console.log('🚴 Inserting delivery agents...');
  await seedAgents();

  console.log('📦 Inserting orders (this may take a minute)...');
  await seedOrders();

  console.log('\n🎉 All data seeded successfully from Assets CSVs!');
  process.exit(0);
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
