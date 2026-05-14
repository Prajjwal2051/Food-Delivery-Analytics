import { Router, Response } from 'express';
import { and, gte, isNotNull, sql, lte, ilike, inArray, count } from 'drizzle-orm';
import { db } from '../db';
import { restaurants } from '../db/schema/restaurants';
import { deliveryAgents } from '../db/schema/delivery_agents';
import { orders } from '../db/schema/orders';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// Top 5 most active Bangalore areas exposed to the frontend
export const SUPPORTED_AREAS = [
  'BTM Layout',
  'Bannerghatta Road',
  'Yelahanka',
  'Brookefield',
  'Hebbal',
] as const;

export type SupportedArea = (typeof SUPPORTED_AREAS)[number] | 'All Bangalore';

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const areaParam = req.query.area as string | undefined;
    const isFiltered =
      areaParam &&
      areaParam !== 'All Bangalore' &&
      (SUPPORTED_AREAS as readonly string[]).includes(areaParam);

    // ── 1. Restaurants ────────────────────────────────────────────────────────
    const restaurantBaseCondition = and(
      isNotNull(restaurants.latitude),
      isNotNull(restaurants.longitude),
    );

    const restaurantData = await db
      .select({
        id: restaurants.restaurantId,
        name: restaurants.name,
        latitude: restaurants.latitude,
        longitude: restaurants.longitude,
        locationNeighborhood: restaurants.locationNeighborhood,
        rate: restaurants.rate,
        cuisines: restaurants.cuisines,
        restType: restaurants.restType,
        onlineOrder: restaurants.onlineOrder,
      })
      .from(restaurants)
      .where(
        isFiltered
          ? and(restaurantBaseCondition, ilike(restaurants.locationNeighborhood, `%${areaParam}%`))
          : restaurantBaseCondition,
      )
      .limit(isFiltered ? 500 : 200);

    // ── 2. Orders ─────────────────────────────────────────────────────────────
    const areaRestaurantIds = restaurantData.map((r) => r.id).filter(Boolean) as string[];

    const orderBaseCondition = and(
      isNotNull(orders.restaurantLatitude),
      isNotNull(orders.deliveryLocationLatitude),
    );

    const orderData = await db
      .select({
        orderId: orders.orderId,
        restaurantId: orders.restaurantId,
        deliveryPersonId: orders.deliveryPersonId,
        restaurantLatitude: orders.restaurantLatitude,
        restaurantLongitude: orders.restaurantLongitude,
        deliveryLocationLatitude: orders.deliveryLocationLatitude,
        deliveryLocationLongitude: orders.deliveryLocationLongitude,
        typeOfOrder: orders.typeOfOrder,
        typeOfVehicle: orders.typeOfVehicle,
        weatherConditions: orders.weatherConditions,
        roadTrafficDensity: orders.roadTrafficDensity,
        timeTakenMin: orders.timeTakenMin,
        festival: orders.festival,
      })
      .from(orders)
      .where(
        isFiltered && areaRestaurantIds.length > 0
          ? and(orderBaseCondition, inArray(orders.restaurantId, areaRestaurantIds))
          : orderBaseCondition,
      )
      .orderBy(sql`RANDOM()`)
      .limit(80);

    // ── 3. Delivery Agents ────────────────────────────────────────────────────
    const agentBaseCondition = and(
      isNotNull(deliveryAgents.currentLatitude),
      isNotNull(deliveryAgents.currentLongitude),
    );

    let agentCondition = agentBaseCondition;

    if (isFiltered && restaurantData.length > 0) {
      const lats = restaurantData
        .map((r) => (r.latitude ? parseFloat(r.latitude) : null))
        .filter((v): v is number => v !== null);
      const lngs = restaurantData
        .map((r) => (r.longitude ? parseFloat(r.longitude) : null))
        .filter((v): v is number => v !== null);

      if (lats.length > 0 && lngs.length > 0) {
        const BUFFER = 0.018;
        const minLat = (Math.min(...lats) - BUFFER).toString();
        const maxLat = (Math.max(...lats) + BUFFER).toString();
        const minLng = (Math.min(...lngs) - BUFFER).toString();
        const maxLng = (Math.max(...lngs) + BUFFER).toString();

        agentCondition = and(
          agentBaseCondition,
          gte(deliveryAgents.currentLatitude, minLat),
          lte(deliveryAgents.currentLatitude, maxLat),
          gte(deliveryAgents.currentLongitude, minLng),
          lte(deliveryAgents.currentLongitude, maxLng),
        );
      }
    }

    const agentData = await db
      .select({
        id: deliveryAgents.deliveryPersonId,
        firstName: deliveryAgents.firstName,
        lastName: deliveryAgents.lastName,
        latitude: deliveryAgents.currentLatitude,
        longitude: deliveryAgents.currentLongitude,
        status: deliveryAgents.status,
        vehicleType: deliveryAgents.vehicleType,
        ratings: deliveryAgents.ratings,
        totalDeliveries: deliveryAgents.totalDeliveries,
      })
      .from(deliveryAgents)
      .where(agentCondition)
      .limit(400);

    // ── 4. Global stats — real COUNT(*) queries run in parallel ──────────────
    const [
      [{ totalRestaurants }],
      [{ totalAgents }],
      [{ totalOrders }],
      statusCounts,
    ] = await Promise.all([
      db.select({ totalRestaurants: count() }).from(restaurants),
      db.select({ totalAgents: count() }).from(deliveryAgents),
      db.select({ totalOrders: count() }).from(orders),
      db
        .select({
          status: deliveryAgents.status,
          cnt: sql<number>`COUNT(*)::int`,
        })
        .from(deliveryAgents)
        .groupBy(deliveryAgents.status),
    ]);

    const agentStats: Record<string, number> = { Available: 0, 'On Delivery': 0, Offline: 0 };
    for (const row of statusCounts) {
      if (row.status) agentStats[row.status] = Number(row.cnt);
    }

    res.json({
      area: areaParam || 'All Bangalore',
      restaurants: restaurantData.map((r) => ({
        ...r,
        latitude: r.latitude ? parseFloat(r.latitude) : null,
        longitude: r.longitude ? parseFloat(r.longitude) : null,
        rate: r.rate ? parseFloat(r.rate) : null,
      })),
      deliveryAgents: agentData.map((a) => ({
        ...a,
        name: `${a.firstName} ${a.lastName}`,
        latitude: a.latitude ? parseFloat(a.latitude) : null,
        longitude: a.longitude ? parseFloat(a.longitude) : null,
      })),
      activeOrders: orderData.map((o) => ({
        ...o,
        restaurantLatitude: o.restaurantLatitude ? parseFloat(o.restaurantLatitude) : null,
        restaurantLongitude: o.restaurantLongitude ? parseFloat(o.restaurantLongitude) : null,
        deliveryLocationLatitude: o.deliveryLocationLatitude
          ? parseFloat(o.deliveryLocationLatitude)
          : null,
        deliveryLocationLongitude: o.deliveryLocationLongitude
          ? parseFloat(o.deliveryLocationLongitude)
          : null,
      })),
      stats: {
        totalRestaurants: Number(totalRestaurants),
        totalAgents: Number(totalAgents),
        totalOrders: Number(totalOrders),
        available: agentStats['Available'],
        onDelivery: agentStats['On Delivery'],
        offline: agentStats['Offline'],
      },
      supportedAreas: ['All Bangalore', ...SUPPORTED_AREAS],
    });
  } catch (err) {
    console.error('GET /api/map-data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
