import { Router, Response } from 'express';
import { sql, inArray, eq } from 'drizzle-orm';
import { db } from '../db';
import { orders } from '../db/schema/orders';
import { deliveryAgents } from '../db/schema/delivery_agents';
import { restaurants } from '../db/schema/restaurants';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// In-memory cache for analytics to prevent lag on the frontend
let analyticsCache: any = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * GET /api/analytics
 * Aggregated analytics from the full 32k-order dataset.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (analyticsCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
      res.json(analyticsCache);
      return;
    }

    const [
      ordersByWeather,
      ordersByTraffic,
      ordersByVehicle,
      ordersByType,
      avgTimeByTraffic,
      avgTimeByWeather,
      topRestaurants,
      topAgents,
      ordersByHour,
      festivalImpact,
      deliveryTimeDistribution,
      ordersByNeighborhood,
      distanceVsTime,
      prepTimeByOrderType,
      vehicleConditionImpact,
    ] = await Promise.all([
      // Orders by weather condition
      db.select({
        weather: orders.weatherConditions,
        count: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.weatherConditions).orderBy(sql`COUNT(*) DESC`),

      // Orders by traffic density
      db.select({
        traffic: orders.roadTrafficDensity,
        count: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.roadTrafficDensity).orderBy(sql`COUNT(*) DESC`),

      // Orders by vehicle type
      db.select({
        vehicle: orders.typeOfVehicle,
        count: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.typeOfVehicle).orderBy(sql`COUNT(*) DESC`),

      // Orders by order type
      db.select({
        type: orders.typeOfOrder,
        count: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.typeOfOrder).orderBy(sql`COUNT(*) DESC`),

      // Avg delivery time by traffic
      db.select({
        traffic: orders.roadTrafficDensity,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
        minTime: sql<number>`MIN(time_taken_min)`,
        maxTime: sql<number>`MAX(time_taken_min)`,
      }).from(orders).groupBy(orders.roadTrafficDensity),

      // Avg delivery time by weather
      db.select({
        weather: orders.weatherConditions,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.weatherConditions),

      // Top restaurants by order count
      db.select({
        restaurantId: orders.restaurantId,
        orderCount: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      })
        .from(orders)
        .groupBy(orders.restaurantId)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10),

      // Top agents by delivery count
      db.select({
        deliveryPersonId: orders.deliveryPersonId,
        orderCount: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      })
        .from(orders)
        .groupBy(orders.deliveryPersonId)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10),

      // Orders by hour of day (from time_ordered)
      db.select({
        hour: sql<number>`EXTRACT(HOUR FROM time_ordered::time)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(orders)
        .groupBy(sql`EXTRACT(HOUR FROM time_ordered::time)`)
        .orderBy(sql`EXTRACT(HOUR FROM time_ordered::time)`),

      // Festival impact
      db.select({
        festival: orders.festival,
        count: sql<number>`COUNT(*)`,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
      }).from(orders).groupBy(orders.festival),

      // Delivery time distribution (buckets)
      db.select({
        bucket: sql<string>`
          CASE 
            WHEN time_taken_min < 20 THEN 'Under 20 min'
            WHEN time_taken_min < 30 THEN '20–30 min'
            WHEN time_taken_min < 40 THEN '30–40 min'
            WHEN time_taken_min < 50 THEN '40–50 min'
            ELSE 'Over 50 min'
          END
        `,
        count: sql<number>`COUNT(*)`,
      })
        .from(orders)
        .groupBy(sql`
          CASE 
            WHEN time_taken_min < 20 THEN 'Under 20 min'
            WHEN time_taken_min < 30 THEN '20–30 min'
            WHEN time_taken_min < 40 THEN '30–40 min'
            WHEN time_taken_min < 50 THEN '40–50 min'
            ELSE 'Over 50 min'
          END
        `)
        .orderBy(sql`MIN(time_taken_min)`),

      // Orders by neighborhood
      db.select({
        neighborhood: restaurants.locationNeighborhood,
        count: sql<number>`COUNT(*)`,
      })
        .from(orders)
        .innerJoin(restaurants, eq(orders.restaurantId, restaurants.restaurantId))
        .groupBy(restaurants.locationNeighborhood)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10),

      // Distance vs Delivery Time
      db.select({
        distanceBucket: sql<string>`
          CASE 
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 3 THEN '0–3 km'
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 6 THEN '3–6 km'
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 10 THEN '6–10 km'
            ELSE '10+ km'
          END
        `,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(orders)
        .where(sql`restaurant_latitude IS NOT NULL AND delivery_location_latitude IS NOT NULL`)
        .groupBy(sql`
          CASE 
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 3 THEN '0–3 km'
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 6 THEN '3–6 km'
            WHEN (6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            )) < 10 THEN '6–10 km'
            ELSE '10+ km'
          END
        `)
        .orderBy(sql`MIN(6371 * acos(
              cos(radians(restaurant_latitude::float)) * cos(radians(delivery_location_latitude::float)) * 
              cos(radians(delivery_location_longitude::float) - radians(restaurant_longitude::float)) + 
              sin(radians(restaurant_latitude::float)) * sin(radians(delivery_location_latitude::float))
            ))`),

      // Prep Time vs Order Type
      db.select({
        type: orders.typeOfOrder,
        prepTime: sql<number>`ROUND(AVG(
          CASE 
            WHEN time_order_picked::time >= time_ordered::time 
            THEN EXTRACT(EPOCH FROM (time_order_picked::time - time_ordered::time))
            ELSE EXTRACT(EPOCH FROM (time_order_picked::time - time_ordered::time)) + 86400
          END / 60
        )::numeric, 1)`,
      })
        .from(orders)
        .where(sql`time_ordered IS NOT NULL AND time_order_picked IS NOT NULL`)
        .groupBy(orders.typeOfOrder),

      // Vehicle Condition Impact
      db.select({
        condition: orders.vehicleCondition,
        avgTime: sql<number>`ROUND(AVG(time_taken_min)::numeric, 1)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(orders)
        .where(sql`vehicle_condition IS NOT NULL`)
        .groupBy(orders.vehicleCondition)
        .orderBy(orders.vehicleCondition),
    ]);

    // Enrich top restaurants with names
    const restaurantIds = topRestaurants.map(r => r.restaurantId).filter((id): id is string => id !== null);
    const restaurantNames = restaurantIds.length
      ? await db
          .select({ restaurantId: restaurants.restaurantId, name: restaurants.name })
          .from(restaurants)
          .where(inArray(restaurants.restaurantId, restaurantIds))
      : [];

    const nameMap: Record<string, string> = {};
    for (const r of restaurantNames) nameMap[r.restaurantId] = r.name;

    // Enrich top agents with names
    const agentIds = topAgents.map(a => a.deliveryPersonId).filter((id): id is string => id !== null);
    const agentNames = agentIds.length
      ? await db
          .select({
            deliveryPersonId: deliveryAgents.deliveryPersonId,
            firstName: deliveryAgents.firstName,
            lastName: deliveryAgents.lastName,
            vehicleType: deliveryAgents.vehicleType,
          })
          .from(deliveryAgents)
          .where(inArray(deliveryAgents.deliveryPersonId, agentIds))
      : [];

    const agentNameMap: Record<string, { name: string; vehicleType: string | null }> = {};
    for (const a of agentNames) {
      agentNameMap[a.deliveryPersonId] = {
        name: `${a.firstName} ${a.lastName}`,
        vehicleType: a.vehicleType,
      };
    }

    const responseData = {
      ordersByWeather: ordersByWeather.map(r => ({ ...r, count: Number(r.count), avgTime: Number(r.avgTime) })),
      ordersByTraffic: ordersByTraffic.map(r => ({ ...r, count: Number(r.count), avgTime: Number(r.avgTime) })),
      ordersByVehicle: ordersByVehicle.map(r => ({ ...r, count: Number(r.count), avgTime: Number(r.avgTime) })),
      ordersByType: ordersByType.map(r => ({ ...r, count: Number(r.count), avgTime: Number(r.avgTime) })),
      avgTimeByTraffic: avgTimeByTraffic.map(r => ({
        ...r, avgTime: Number(r.avgTime), minTime: Number(r.minTime), maxTime: Number(r.maxTime)
      })),
      avgTimeByWeather: avgTimeByWeather.map(r => ({ ...r, avgTime: Number(r.avgTime) })),
      topRestaurants: topRestaurants.map(r => ({
        restaurantId: r.restaurantId,
        name: nameMap[r.restaurantId!] || r.restaurantId,
        orderCount: Number(r.orderCount),
        avgTime: Number(r.avgTime),
      })),
      topAgents: topAgents.map(a => ({
        deliveryPersonId: a.deliveryPersonId,
        name: agentNameMap[a.deliveryPersonId!]?.name || a.deliveryPersonId,
        vehicleType: agentNameMap[a.deliveryPersonId!]?.vehicleType || null,
        orderCount: Number(a.orderCount),
        avgTime: Number(a.avgTime),
      })),
      ordersByHour: ordersByHour.map(r => ({ hour: Number(r.hour), count: Number(r.count) })),
      festivalImpact: festivalImpact.map(r => ({ festival: r.festival, count: Number(r.count), avgTime: Number(r.avgTime) })),
      deliveryTimeDistribution: deliveryTimeDistribution.map(r => ({ bucket: r.bucket, count: Number(r.count) })),
      ordersByNeighborhood: ordersByNeighborhood.map(r => ({ neighborhood: r.neighborhood || 'Unknown', count: Number(r.count) })),
      distanceVsTime: distanceVsTime.map(r => ({ distanceBucket: r.distanceBucket, avgTime: Number(r.avgTime), count: Number(r.count) })),
      prepTimeByOrderType: prepTimeByOrderType.map(r => ({ type: r.type, prepTime: Number(r.prepTime) })),
      vehicleConditionImpact: vehicleConditionImpact.map(r => ({ condition: r.condition, avgTime: Number(r.avgTime), count: Number(r.count) })),
    };

    analyticsCache = responseData;
    lastCacheUpdate = Date.now();

    res.json(responseData);
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Force cache invalidation
router.post('/cache-bust', authenticate, (req: AuthRequest, res: Response) => {
  analyticsCache = null;
  lastCacheUpdate = 0;
  res.json({ ok: true });
});

export default router;
