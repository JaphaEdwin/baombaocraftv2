/**
 * Quotation Routes
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, adminOnly, optionalAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  duplicateQuotation,
  generateQuotationPDF,
  getQuotationTemplates,
} from '../controllers/quotation.controller.js';

const router = Router();

// Validation rules
const createQuotationValidation = [
  body('customerId').isUUID().withMessage('Valid customer ID required'),
  body('title').trim().notEmpty().withMessage('Quote title required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.name').trim().notEmpty().withMessage('Item name required'),
  body('items.*.unitPrice').isNumeric().withMessage('Valid unit price required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
  body('validUntil').optional().isISO8601().withMessage('Valid date required'),
];

const updateQuotationValidation = [
  param('id').isUUID().withMessage('Valid quotation ID required'),
  body('title').optional().trim().notEmpty(),
  body('items').optional().isArray({ min: 1 }),
];

// Routes

// Get all quotations (Admin: all, Customer: own)
router.get('/', authenticate, getQuotations);

// Get templates (Admin only)
router.get('/templates', authenticate, adminOnly, getQuotationTemplates);

// Get single quotation
router.get('/:id', authenticate, getQuotationById);

// Create quotation (Admin only)
router.post(
  '/',
  authenticate,
  adminOnly,
  createQuotationValidation,
  validateRequest,
  createQuotation
);

// Update quotation (Admin only)
router.put(
  '/:id',
  authenticate,
  adminOnly,
  updateQuotationValidation,
  validateRequest,
  updateQuotation
);

// Send quotation to customer (Admin only)
router.post('/:id/send', authenticate, adminOnly, sendQuotation);

// Duplicate quotation (Admin only)
router.post('/:id/duplicate', authenticate, adminOnly, duplicateQuotation);

// Generate PDF
router.get('/:id/pdf', authenticate, generateQuotationPDF);

// Customer actions
router.post('/:id/accept', authenticate, acceptQuotation);
router.post('/:id/reject', authenticate, rejectQuotation);

export default router;
