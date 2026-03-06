import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, adminOnly, optionalAuth } from '../middleware/auth.js';
import * as cmsController from '../controllers/cms.controller.js';

const router = Router();

// ==================== BLOG POSTS ====================

/**
 * @route   GET /api/cms/blog
 * @desc    Get published blog posts (public)
 * @access  Public
 */
router.get(
  '/blog',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    query('category').optional().trim(),
    validateRequest,
  ],
  cmsController.getBlogPosts
);

/**
 * @route   GET /api/cms/blog/:slug
 * @desc    Get single blog post by slug
 * @access  Public
 */
router.get(
  '/blog/:slug',
  optionalAuth,
  [param('slug').trim().notEmpty(), validateRequest],
  cmsController.getBlogPostBySlug
);

/**
 * @route   POST /api/cms/blog
 * @desc    Create blog post
 * @access  Admin
 */
router.post(
  '/blog',
  authenticate,
  adminOnly,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('slug').trim().notEmpty().withMessage('Slug required'),
    body('excerpt').optional().trim(),
    body('content').trim().notEmpty().withMessage('Content required'),
    body('featuredImage').optional().isURL(),
    body('category').optional().trim(),
    body('tags').optional().isArray(),
    body('status').optional().isIn(['draft', 'published']),
    validateRequest,
  ],
  cmsController.createBlogPost
);

/**
 * @route   PUT /api/cms/blog/:id
 * @desc    Update blog post
 * @access  Admin
 */
router.put(
  '/blog/:id',
  authenticate,
  adminOnly,
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('slug').optional().trim().notEmpty(),
    body('excerpt').optional().trim(),
    body('content').optional().trim().notEmpty(),
    body('featuredImage').optional().isURL(),
    body('status').optional().isIn(['draft', 'published']),
    validateRequest,
  ],
  cmsController.updateBlogPost
);

/**
 * @route   DELETE /api/cms/blog/:id
 * @desc    Delete blog post
 * @access  Admin
 */
router.delete(
  '/blog/:id',
  authenticate,
  adminOnly,
  [param('id').isUUID(), validateRequest],
  cmsController.deleteBlogPost
);

// ==================== TESTIMONIALS ====================

/**
 * @route   GET /api/cms/testimonials
 * @desc    Get approved testimonials (public)
 * @access  Public
 */
router.get('/testimonials', cmsController.getTestimonials);

/**
 * @route   POST /api/cms/testimonials
 * @desc    Submit testimonial (customer)
 * @access  Authenticated
 */
router.post(
  '/testimonials',
  authenticate,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating 1-5 required'),
    body('content').trim().notEmpty().withMessage('Content required'),
    body('projectId').optional().isUUID(),
    validateRequest,
  ],
  cmsController.submitTestimonial
);

/**
 * @route   PUT /api/cms/testimonials/:id/approve
 * @desc    Approve/reject testimonial
 * @access  Admin
 */
router.put(
  '/testimonials/:id/approve',
  authenticate,
  adminOnly,
  [
    param('id').isUUID(),
    body('approved').isBoolean(),
    body('featured').optional().isBoolean(),
    validateRequest,
  ],
  cmsController.approveTestimonial
);

// ==================== CASE STUDIES ====================

/**
 * @route   GET /api/cms/case-studies
 * @desc    Get published case studies
 * @access  Public
 */
router.get(
  '/case-studies',
  [
    query('category').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 20 }),
    validateRequest,
  ],
  cmsController.getCaseStudies
);

/**
 * @route   GET /api/cms/case-studies/:slug
 * @desc    Get single case study
 * @access  Public
 */
router.get(
  '/case-studies/:slug',
  [param('slug').trim().notEmpty(), validateRequest],
  cmsController.getCaseStudyBySlug
);

/**
 * @route   POST /api/cms/case-studies
 * @desc    Create case study
 * @access  Admin
 */
router.post(
  '/case-studies',
  authenticate,
  adminOnly,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('slug').trim().notEmpty().withMessage('Slug required'),
    body('clientName').trim().notEmpty().withMessage('Client name required'),
    body('challenge').trim().notEmpty().withMessage('Challenge description required'),
    body('solution').trim().notEmpty().withMessage('Solution description required'),
    body('results').trim().notEmpty().withMessage('Results description required'),
    body('images').isArray({ min: 1 }).withMessage('At least one image required'),
    body('category').optional().trim(),
    body('projectId').optional().isUUID(),
    body('status').optional().isIn(['draft', 'published']),
    validateRequest,
  ],
  cmsController.createCaseStudy
);

/**
 * @route   PUT /api/cms/case-studies/:id
 * @desc    Update case study
 * @access  Admin
 */
router.put(
  '/case-studies/:id',
  authenticate,
  adminOnly,
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('slug').optional().trim().notEmpty(),
    body('status').optional().isIn(['draft', 'published']),
    validateRequest,
  ],
  cmsController.updateCaseStudy
);

/**
 * @route   DELETE /api/cms/case-studies/:id
 * @desc    Delete case study
 * @access  Admin
 */
router.delete(
  '/case-studies/:id',
  authenticate,
  adminOnly,
  [param('id').isUUID(), validateRequest],
  cmsController.deleteCaseStudy
);

// ==================== PRODUCTS (for website) ====================

/**
 * @route   GET /api/cms/products
 * @desc    Get products for website display
 * @access  Public
 */
router.get(
  '/products',
  [
    query('category').optional().trim(),
    query('featured').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest,
  ],
  cmsController.getProducts
);

/**
 * @route   POST /api/cms/products
 * @desc    Create/update product
 * @access  Admin
 */
router.post(
  '/products',
  authenticate,
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Product name required'),
    body('category').trim().notEmpty().withMessage('Category required'),
    body('description').optional().trim(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('images').optional().isArray(),
    body('specifications').optional().isObject(),
    body('isActive').optional().isBoolean(),
    validateRequest,
  ],
  cmsController.createProduct
);

export default router;
