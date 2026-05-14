import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { restaurants } from '../db/schema/restaurants';
import { orders } from '../db/schema/orders';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

/**
 * GET /api/restaurant
 * Returns a list of restaurants with optional filtering.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, cuisine, rating } = req.query;
    
    let query = db.select().from(restaurants);
    // Simple filter in memory for simplicity (or use Drizzle where conditions)
    // Note: To do dynamic where clauses in Drizzle, you build an array of conditions and use and(...conditions)
    // But since it's a simple dashboard, pulling and filtering or using basic ilike is fine.
    // For now, let's just fetch all and filter in JS if not too large, or implement basic Drizzle filters.
    
    const allRestaurants = await query;
    
    let filtered = allRestaurants;
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter(r => r.name?.toLowerCase().includes(s) || r.address?.toLowerCase().includes(s));
    }
    if (cuisine && cuisine !== 'all') {
      const c = String(cuisine).toLowerCase();
      filtered = filtered.filter(r => r.cuisines?.toLowerCase().includes(c));
    }
    if (rating) {
      const minRating = parseFloat(String(rating));
      filtered = filtered.filter(r => r.rate && parseFloat(r.rate) >= minRating);
    }
    
    res.json({
      restaurants: filtered.map(r => ({
        ...r,
        latitude: r.latitude ? parseFloat(r.latitude) : null,
        longitude: r.longitude ? parseFloat(r.longitude) : null,
        rate: r.rate ? parseFloat(r.rate) : null,
      }))
    });
  } catch (err) {
    console.error('GET /api/restaurant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/restaurant/:id
 * Returns detailed restaurant info and its current/recent orders.
 * Protected by JWT authentication.
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Fetch restaurant details
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.restaurantId, id))
      .limit(1);

    if (!restaurant) {
      res.status(404).json({ error: `Restaurant with id '${id}' not found` });
      return;
    }

    // Fetch current / recent orders for this restaurant
    const restaurantOrders = await db
      .select({
        orderId: orders.orderId,
        userId: orders.userId,
        deliveryPersonId: orders.deliveryPersonId,
        orderDate: orders.orderDate,
        timeOrdered: orders.timeOrdered,
        timeOrderPicked: orders.timeOrderPicked,
        timeTakenMin: orders.timeTakenMin,
        weatherConditions: orders.weatherConditions,
        roadTrafficDensity: orders.roadTrafficDensity,
        typeOfOrder: orders.typeOfOrder,
        typeOfVehicle: orders.typeOfVehicle,
        multipleDeliveries: orders.multipleDeliveries,
        festival: orders.festival,
        deliveryLocationLatitude: orders.deliveryLocationLatitude,
        deliveryLocationLongitude: orders.deliveryLocationLongitude,
      })
      .from(orders)
      .where(eq(orders.restaurantId, id))
      .orderBy(orders.orderDate)
      .limit(50);

    res.json({
      restaurant: {
        ...restaurant,
        latitude: restaurant.latitude ? parseFloat(restaurant.latitude) : null,
        longitude: restaurant.longitude ? parseFloat(restaurant.longitude) : null,
        rate: restaurant.rate ? parseFloat(restaurant.rate) : null,
        approxCostForTwo: restaurant.approxCostForTwo,
      },
      currentOrders: restaurantOrders,
      totalOrdersFetched: restaurantOrders.length,
    });
  } catch (err) {
    console.error(`GET /api/restaurant/${id} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
