import { Router, Response } from 'express';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { deliveryAgents } from '../db/schema/delivery_agents';
import { orders } from '../db/schema/orders';
import { restaurants } from '../db/schema/restaurants';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

/**
 * GET /api/delivery-partner
 * Returns all 2000 delivery agents for client-side filtering.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allAgents = await db
      .select({
        deliveryPersonId: deliveryAgents.deliveryPersonId,
        firstName: deliveryAgents.firstName,
        lastName: deliveryAgents.lastName,
        phone: deliveryAgents.phone,
        age: deliveryAgents.age,
        ratings: deliveryAgents.ratings,
        vehicleType: deliveryAgents.vehicleType,
        vehicleCondition: deliveryAgents.vehicleCondition,
        status: deliveryAgents.status,
        currentLatitude: deliveryAgents.currentLatitude,
        currentLongitude: deliveryAgents.currentLongitude,
        totalDeliveries: deliveryAgents.totalDeliveries,
        city: deliveryAgents.city,
      })
      .from(deliveryAgents)
      .orderBy(deliveryAgents.totalDeliveries);

    res.json({ agents: allAgents });
  } catch (err) {
    console.error('GET /api/delivery-partner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/delivery-partner/:id
 * Returns full agent details + their orders + the restaurants they served.
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [agent] = await db
      .select()
      .from(deliveryAgents)
      .where(eq(deliveryAgents.deliveryPersonId, id))
      .limit(1);

    if (!agent) {
      res.status(404).json({ error: `Delivery partner '${id}' not found` });
      return;
    }

    const agentOrders = await db
      .select({
        orderId: orders.orderId,
        restaurantId: orders.restaurantId,
        userId: orders.userId,
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
        restaurantLatitude: orders.restaurantLatitude,
        restaurantLongitude: orders.restaurantLongitude,
        deliveryLocationLatitude: orders.deliveryLocationLatitude,
        deliveryLocationLongitude: orders.deliveryLocationLongitude,
      })
      .from(orders)
      .where(eq(orders.deliveryPersonId, id))
      .limit(100);

    // Compute personal analytics
    const totalTime = agentOrders.reduce((s, o) => s + (o.timeTakenMin || 0), 0);
    const avgTime = agentOrders.length ? (totalTime / agentOrders.length).toFixed(1) : null;

    const weatherBreakdown: Record<string, number> = {};
    const trafficBreakdown: Record<string, number> = {};
    for (const o of agentOrders) {
      if (o.weatherConditions) weatherBreakdown[o.weatherConditions] = (weatherBreakdown[o.weatherConditions] || 0) + 1;
      if (o.roadTrafficDensity) trafficBreakdown[o.roadTrafficDensity] = (trafficBreakdown[o.roadTrafficDensity] || 0) + 1;
    }

    res.json({
      agent: {
        ...agent,
        currentLatitude: agent.currentLatitude ? parseFloat(agent.currentLatitude) : null,
        currentLongitude: agent.currentLongitude ? parseFloat(agent.currentLongitude) : null,
        ratings: agent.ratings ? parseFloat(agent.ratings) : null,
      },
      orders: agentOrders.map(o => ({
        ...o,
        restaurantLatitude: o.restaurantLatitude ? parseFloat(o.restaurantLatitude) : null,
        restaurantLongitude: o.restaurantLongitude ? parseFloat(o.restaurantLongitude) : null,
        deliveryLocationLatitude: o.deliveryLocationLatitude ? parseFloat(o.deliveryLocationLatitude) : null,
        deliveryLocationLongitude: o.deliveryLocationLongitude ? parseFloat(o.deliveryLocationLongitude) : null,
      })),
      analytics: {
        totalOrdersFetched: agentOrders.length,
        avgDeliveryTime: avgTime,
        weatherBreakdown,
        trafficBreakdown,
      },
    });
  } catch (err) {
    console.error(`GET /api/delivery-partner/${id} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
