import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, adminOnly, authorize } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// ==================== DASHBOARD ====================

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard overview stats
 * @access  Admin
 */
router.get('/dashboard', adminOnly, analyticsController.getDashboardStats);

/**
 * @route   GET /api/analytics/dashboard/partner
 * @desc    Get partner dashboard stats
 * @access  Partner
 */
router.get(
  '/dashboard/partner',
  authorize('partner'),
  analyticsController.getPartnerDashboard
);

// ==================== SALES & REVENUE ====================

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Admin
 */
router.get(
  '/revenue',
  adminOnly,
  [
    query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest,
  ],
  analyticsController.getRevenueAnalytics
);

/**
 * @route   GET /api/analytics/quotes
 * @desc    Get quotation analytics
 * @access  Admin
 */
router.get(
  '/quotes',
  adminOnly,
  [
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
    validateRequest,
  ],
  analyticsController.getQuotationAnalytics
);

// ==================== LEAD SCORING ====================

/**
 * @route   GET /api/analytics/leads
 * @desc    Get lead analytics and scores
 * @access  Admin
 */
router.get('/leads', adminOnly, analyticsController.getLeadAnalytics);

/**
 * @route   GET /api/analytics/leads/top
 * @desc    Get top leads by score
 * @access  Admin
 */
router.get(
  '/leads/top',
  adminOnly,
  [query('limit').optional().isInt({ min: 1, max: 50 }), validateRequest],
  analyticsController.getTopLeads
);

// ==================== PROJECTS ====================

/**
 * @route   GET /api/analytics/projects
 * @desc    Get project analytics
 * @access  Admin
 */
router.get(
  '/projects',
  adminOnly,
  [
    query('period').optional().isIn(['month', 'quarter', 'year']),
    validateRequest,
  ],
  analyticsController.getProjectAnalytics
);

// ==================== PRODUCTS & CATEGORIES ====================

/**
 * @route   GET /api/analytics/products
 * @desc    Get product performance analytics
 * @access  Admin
 */
router.get('/products', adminOnly, analyticsController.getProductAnalytics);

// ==================== CUSTOMER INSIGHTS ====================

/**
 * @route   GET /api/analytics/customers
 * @desc    Get customer analytics
 * @access  Admin
 */
router.get('/customers', adminOnly, analyticsController.getCustomerAnalytics);

// ==================== EVENTS TRACKING ====================

/**
 * @route   POST /api/analytics/events
 * @desc    Track analytics event
 * @access  Public (for website tracking)
 */
router.post(
  '/events',
  analyticsController.trackEvent // Special handling - no auth required
);

/**
 * @route   GET /api/analytics/events
 * @desc    Get events data
 * @access  Admin
 */
router.get(
  '/events',
  adminOnly,
  [
    query('eventType').optional().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest,
  ],
  analyticsController.getEvents
);

export default router;
