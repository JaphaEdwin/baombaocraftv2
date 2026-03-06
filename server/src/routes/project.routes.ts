import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, authorize, adminOnly } from '../middleware/auth.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/projects
 * @desc    Get projects (filtered by role)
 * @access  Authenticated
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest,
  ],
  projectController.getProjects
);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project with details
 * @access  Owner/Admin
 */
router.get(
  '/:id',
  [param('id').isUUID(), validateRequest],
  projectController.getProjectById
);

/**
 * @route   POST /api/projects
 * @desc    Create new project (from quotation or direct)
 * @access  Admin
 */
router.post(
  '/',
  adminOnly,
  [
    body('quotationId').optional().isUUID(),
    body('customerId').isUUID().withMessage('Customer ID required'),
    body('title').trim().notEmpty().withMessage('Project title required'),
    body('description').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('estimatedEndDate').optional().isISO8601(),
    body('budget').optional().isFloat({ min: 0 }),
    validateRequest,
  ],
  projectController.createProject
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project details
 * @access  Admin
 */
router.put(
  '/:id',
  adminOnly,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('estimatedEndDate').optional().isISO8601(),
    body('actualEndDate').optional().isISO8601(),
    body('assignedTo').optional().isUUID(),
    validateRequest,
  ],
  projectController.updateProject
);

/**
 * @route   POST /api/projects/:id/milestones
 * @desc    Add milestone to project
 * @access  Admin
 */
router.post(
  '/:id/milestones',
  adminOnly,
  [
    param('id').isUUID(),
    body('title').trim().notEmpty().withMessage('Milestone title required'),
    body('description').optional().trim(),
    body('dueDate').isISO8601().withMessage('Due date required'),
    body('paymentRequired').optional().isFloat({ min: 0 }),
    body('order').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  projectController.addMilestone
);

/**
 * @route   PUT /api/projects/:id/milestones/:milestoneId
 * @desc    Update milestone
 * @access  Admin
 */
router.put(
  '/:id/milestones/:milestoneId',
  adminOnly,
  [
    param('id').isUUID(),
    param('milestoneId').isUUID(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved']),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601(),
    body('completedDate').optional().isISO8601(),
    validateRequest,
  ],
  projectController.updateMilestone
);

/**
 * @route   POST /api/projects/:id/photos
 * @desc    Upload progress photos
 * @access  Admin/Partner
 */
router.post(
  '/:id/photos',
  authorize('admin', 'partner'),
  [
    param('id').isUUID(),
    body('photoUrl').isURL().withMessage('Photo URL required'),
    body('caption').optional().trim(),
    body('milestoneId').optional().isUUID(),
    validateRequest,
  ],
  projectController.addProgressPhoto
);

/**
 * @route   GET /api/projects/:id/timeline
 * @desc    Get project timeline/activity
 * @access  Owner/Admin
 */
router.get(
  '/:id/timeline',
  [param('id').isUUID(), validateRequest],
  projectController.getProjectTimeline
);

/**
 * @route   POST /api/projects/:id/qa-checklist
 * @desc    Create/update QA checklist
 * @access  Admin
 */
router.post(
  '/:id/qa-checklist',
  adminOnly,
  [
    param('id').isUUID(),
    body('items').isArray({ min: 1 }).withMessage('Checklist items required'),
    body('items.*.name').trim().notEmpty(),
    body('items.*.category').optional().trim(),
    validateRequest,
  ],
  projectController.createQAChecklist
);

/**
 * @route   PUT /api/projects/:id/qa-checklist/:checklistId
 * @desc    Update QA checklist item status
 * @access  Admin/Partner
 */
router.put(
  '/:id/qa-checklist/:checklistId',
  authorize('admin', 'partner'),
  [
    param('id').isUUID(),
    param('checklistId').isUUID(),
    body('status').isIn(['pending', 'passed', 'failed', 'needs_review']),
    body('notes').optional().trim(),
    body('photoUrl').optional().isURL(),
    validateRequest,
  ],
  projectController.updateQAChecklistItem
);

/**
 * @route   POST /api/projects/:id/complete
 * @desc    Mark project as complete
 * @access  Admin
 */
router.post(
  '/:id/complete',
  adminOnly,
  [
    param('id').isUUID(),
    body('finalPhotos').optional().isArray(),
    body('customerSignoff').optional().isBoolean(),
    validateRequest,
  ],
  projectController.completeProject
);

export default router;
