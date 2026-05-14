import { Router, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { orders } from '../db/schema/orders';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

/**
 * GET /api/orders
 * Returns a random sample of orders with location data for map visualisation.
 * Capped at 200 rows — the live map never renders more than that, and fetching
 * all 32 k rows caused consistent connection timeouts.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limitParam = req.query.limit;
    const limit = limitParam ? Math.min(Number(limitParam), 500) : 200;

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    res.json({
      orders: allOrders.map((o) => ({
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
    });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
