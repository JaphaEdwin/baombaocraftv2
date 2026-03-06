import { Router } from 'express';
import authRoutes from './auth.routes.js';
import quotationRoutes from './quotation.routes.js';
import paymentRoutes from './payment.routes.js';
import projectRoutes from './project.routes.js';
import cmsRoutes from './cms.routes.js';
import inventoryRoutes from './inventory.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/quotations', quotationRoutes);
router.use('/payments', paymentRoutes);
router.use('/projects', projectRoutes);
router.use('/cms', cmsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/analytics', analyticsRoutes);

// Webhook routes (separate for security)
router.post('/webhooks/mtn-momo', async (req, res) => {
  // MTN MoMo payment callback
  // TODO: Verify webhook signature
  // TODO: Process payment status update
  res.json({ received: true });
});

router.post('/webhooks/airtel', async (req, res) => {
  // Airtel Money payment callback
  res.json({ received: true });
});

export default router;
