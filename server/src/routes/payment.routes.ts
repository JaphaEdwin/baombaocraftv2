/**
 * Payment Routes
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  initiatePayment,
  getPaymentStatus,
  getPaymentHistory,
  processPaymentCallback,
  getPaymentMethods,
  generateReceipt,
} from '../controllers/payment.controller.js';

const router = Router();

// Validation
const initiatePaymentValidation = [
  body('projectId').optional().isUUID(),
  body('quotationId').optional().isUUID(),
  body('amount').isNumeric().withMessage('Valid amount required'),
  body('method').isIn(['mtn_momo', 'airtel_money', 'card']).withMessage('Valid payment method required'),
  body('phone').optional().isMobilePhone('any'),
];

// Routes

// Get available payment methods
router.get('/methods', getPaymentMethods);

// Initiate payment
router.post(
  '/initiate',
  authenticate,
  initiatePaymentValidation,
  validateRequest,
  initiatePayment
);

// Get payment status
router.get('/:id/status', authenticate, getPaymentStatus);

// Get payment history
router.get('/history', authenticate, getPaymentHistory);

// Generate receipt
router.get('/:id/receipt', authenticate, generateReceipt);

// Admin: Get all payments
router.get('/', authenticate, adminOnly, getPaymentHistory);

export default router;
