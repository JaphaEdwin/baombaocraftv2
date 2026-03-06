import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, adminOnly, authorize } from '../middleware/auth.js';
import * as inventoryController from '../controllers/inventory.controller.js';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// ==================== MATERIALS ====================

/**
 * @route   GET /api/inventory/materials
 * @desc    Get all materials with stock levels
 * @access  Admin/Partner
 */
router.get(
  '/materials',
  authorize('admin', 'partner'),
  [
    query('category').optional().trim(),
    query('lowStock').optional().isBoolean(),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
  ],
  inventoryController.getMaterials
);

/**
 * @route   GET /api/inventory/materials/:id
 * @desc    Get single material with history
 * @access  Admin/Partner
 */
router.get(
  '/materials/:id',
  authorize('admin', 'partner'),
  [param('id').isUUID(), validateRequest],
  inventoryController.getMaterialById
);

/**
 * @route   POST /api/inventory/materials
 * @desc    Create new material
 * @access  Admin
 */
router.post(
  '/materials',
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Material name required'),
    body('sku').trim().notEmpty().withMessage('SKU required'),
    body('category').trim().notEmpty().withMessage('Category required'),
    body('unit').trim().notEmpty().withMessage('Unit required (e.g., sheets, meters)'),
    body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost required'),
    body('currentStock').optional().isInt({ min: 0 }),
    body('minStockLevel').optional().isInt({ min: 0 }),
    body('supplierId').optional().isUUID(),
    body('description').optional().trim(),
    validateRequest,
  ],
  inventoryController.createMaterial
);

/**
 * @route   PUT /api/inventory/materials/:id
 * @desc    Update material details
 * @access  Admin
 */
router.put(
  '/materials/:id',
  adminOnly,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('unitCost').optional().isFloat({ min: 0 }),
    body('minStockLevel').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  inventoryController.updateMaterial
);

/**
 * @route   POST /api/inventory/materials/:id/adjust
 * @desc    Adjust stock level (add/remove)
 * @access  Admin/Partner
 */
router.post(
  '/materials/:id/adjust',
  authorize('admin', 'partner'),
  [
    param('id').isUUID(),
    body('type').isIn(['in', 'out', 'adjustment']).withMessage('Type required'),
    body('quantity').isInt().withMessage('Quantity required'),
    body('reason').trim().notEmpty().withMessage('Reason required'),
    body('projectId').optional().isUUID(),
    body('unitCost').optional().isFloat({ min: 0 }),
    validateRequest,
  ],
  inventoryController.adjustStock
);

// ==================== SUPPLIERS ====================

/**
 * @route   GET /api/inventory/suppliers
 * @desc    Get all suppliers
 * @access  Admin
 */
router.get('/suppliers', adminOnly, inventoryController.getSuppliers);

/**
 * @route   POST /api/inventory/suppliers
 * @desc    Create supplier
 * @access  Admin
 */
router.post(
  '/suppliers',
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Supplier name required'),
    body('contactPerson').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().isEmail(),
    body('address').optional().trim(),
    body('categories').optional().isArray(),
    validateRequest,
  ],
  inventoryController.createSupplier
);

/**
 * @route   PUT /api/inventory/suppliers/:id
 * @desc    Update supplier
 * @access  Admin
 */
router.put(
  '/suppliers/:id',
  adminOnly,
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('isActive').optional().isBoolean(),
    validateRequest,
  ],
  inventoryController.updateSupplier
);

// ==================== TRANSACTIONS ====================

/**
 * @route   GET /api/inventory/transactions
 * @desc    Get inventory transactions
 * @access  Admin
 */
router.get(
  '/transactions',
  adminOnly,
  [
    query('materialId').optional().isUUID(),
    query('projectId').optional().isUUID(),
    query('type').optional().isIn(['in', 'out', 'adjustment']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
  ],
  inventoryController.getTransactions
);

// ==================== REPORTS ====================

/**
 * @route   GET /api/inventory/reports/low-stock
 * @desc    Get low stock alerts
 * @access  Admin/Partner
 */
router.get(
  '/reports/low-stock',
  authorize('admin', 'partner'),
  inventoryController.getLowStockReport
);

/**
 * @route   GET /api/inventory/reports/valuation
 * @desc    Get inventory valuation
 * @access  Admin
 */
router.get('/reports/valuation', adminOnly, inventoryController.getValuationReport);

/**
 * @route   GET /api/inventory/reports/usage
 * @desc    Get material usage by project
 * @access  Admin
 */
router.get(
  '/reports/usage',
  adminOnly,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest,
  ],
  inventoryController.getUsageReport
);

export default router;
