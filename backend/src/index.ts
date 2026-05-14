import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import authRouter from './routes/auth';
import mapDataRouter from './routes/mapData';
import restaurantRouter from './routes/restaurant';
import deliveryPartnerRouter from './routes/deliveryPartner';
import ordersRouter from './routes/orders';
import analyticsRouter from './routes/analytics';
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/map-data', mapDataRouter);
app.use('/api/restaurant', restaurantRouter);
app.use('/api/delivery-partner', deliveryPartnerRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Food Delivery Analytics API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Auth:         http://localhost:${PORT}/api/auth/login`);
  console.log(`   Map Data:     http://localhost:${PORT}/api/map-data`);
});

export default app;
