import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, adminOnly, authorize } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users (paginated)
 * @access  Admin
 */
router.get(
  '/',
  adminOnly,
  [
    query('role').optional().isIn(['customer', 'partner', 'admin', 'super_admin']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
  ],
  userController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user
 * @access  Admin or Self
 */
router.get(
  '/:id',
  [param('id').isUUID(), validateRequest],
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin or Self
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    validateRequest,
  ],
  userController.updateUser
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Super Admin
 */
router.put(
  '/:id/role',
  authorize('super_admin'),
  [
    param('id').isUUID(),
    body('role').isIn(['customer', 'partner', 'admin']).withMessage('Invalid role'),
    validateRequest,
  ],
  userController.updateUserRole
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user
 * @access  Admin
 */
router.delete(
  '/:id',
  adminOnly,
  [param('id').isUUID(), validateRequest],
  userController.deactivateUser
);

/**
 * @route   GET /api/users/:id/notifications
 * @desc    Get user notifications
 * @access  Self
 */
router.get(
  '/:id/notifications',
  [
    param('id').isUUID(),
    query('unreadOnly').optional().isBoolean(),
    validateRequest,
  ],
  userController.getUserNotifications
);

/**
 * @route   PUT /api/users/:id/notifications/read
 * @desc    Mark notifications as read
 * @access  Self
 */
router.put(
  '/:id/notifications/read',
  [
    param('id').isUUID(),
    body('notificationIds').optional().isArray(),
    validateRequest,
  ],
  userController.markNotificationsRead
);

export default router;
