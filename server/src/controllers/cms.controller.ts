import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ==================== BLOG POSTS ====================

/**
 * Get blog posts (with admin access to drafts)
 */
export const getBlogPosts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, category } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

  const where: any = {};
  
  // Only show published to non-admins
  if (!isAdmin) {
    where.status = 'published';
  }
  
  if (category) {
    where.category = category;
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        category: true,
        tags: true,
        status: true,
        publishedAt: true,
        author: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get single blog post by slug
 */
export const getBlogPostBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true },
      },
    },
  });

  if (!post) {
    throw new ApiError(404, 'Blog post not found');
  }

  // Only admins can see drafts
  if (post.status !== 'published' && !isAdmin) {
    throw new ApiError(404, 'Blog post not found');
  }

  res.json({
    success: true,
    data: post,
  });
});

/**
 * Create blog post
 */
export const createBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    slug,
    excerpt,
    content,
    featuredImage,
    category,
    tags,
    status = 'draft',
  } = req.body;

  // Check slug uniqueness
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(400, 'Slug already exists');
  }

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      category,
      tags: tags || [],
      status,
      authorId: req.user!.id,
      publishedAt: status === 'published' ? new Date() : null,
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
    },
  });

  logger.info(`Blog post created: ${post.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: post,
    message: 'Blog post created',
  });
});

/**
 * Update blog post
 */
export const updateBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    throw new ApiError(404, 'Blog post not found');
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== post.slug) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: updates.slug } });
    if (existing) {
      throw new ApiError(400, 'Slug already exists');
    }
  }

  // Set published date when publishing
  if (updates.status === 'published' && post.status !== 'published') {
    updates.publishedAt = new Date();
  }

  const updatedPost = await prisma.blogPost.update({
    where: { id },
    data: updates,
    include: {
      author: {
        select: { id: true, name: true },
      },
    },
  });

  res.json({
    success: true,
    data: updatedPost,
    message: 'Blog post updated',
  });
});

/**
 * Delete blog post
 */
export const deleteBlogPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    throw new ApiError(404, 'Blog post not found');
  }

  await prisma.blogPost.delete({ where: { id } });

  logger.info(`Blog post deleted: ${id} by ${req.user!.id}`);

  res.json({
    success: true,
    message: 'Blog post deleted',
  });
});

// ==================== TESTIMONIALS ====================

/**
 * Get approved testimonials
 */
export const getTestimonials = asyncHandler(async (req: Request, res: Response) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { isApproved: true },
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      rating: true,
      content: true,
      isFeatured: true,
      createdAt: true,
      customer: {
        select: { name: true },
      },
      project: {
        select: { title: true },
      },
    },
  });

  res.json({
    success: true,
    data: testimonials,
  });
});

/**
 * Submit testimonial
 */
export const submitTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const { rating, content, projectId } = req.body;

  // Verify project belongs to user if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, customerId: req.user!.id },
    });
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      customerId: req.user!.id,
      projectId,
      rating,
      content,
      isApproved: false,
      isFeatured: false,
    },
  });

  logger.info(`Testimonial submitted: ${testimonial.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: testimonial,
    message: 'Thank you for your feedback! Your testimonial will be reviewed.',
  });
});

/**
 * Approve/reject testimonial
 */
export const approveTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, featured = false } = req.body;

  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) {
    throw new ApiError(404, 'Testimonial not found');
  }

  const updated = await prisma.testimonial.update({
    where: { id },
    data: {
      isApproved: approved,
      isFeatured: approved ? featured : false,
    },
  });

  res.json({
    success: true,
    data: updated,
    message: approved ? 'Testimonial approved' : 'Testimonial rejected',
  });
});

// ==================== CASE STUDIES ====================

/**
 * Get published case studies
 */
export const getCaseStudies = asyncHandler(async (req: Request, res: Response) => {
  const { category, limit = 10 } = req.query;

  const where: any = { status: 'published' };
  if (category) {
    where.category = category;
  }

  const caseStudies = await prisma.caseStudy.findMany({
    where,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      clientName: true,
      category: true,
      images: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: caseStudies,
  });
});

/**
 * Get single case study by slug
 */
export const getCaseStudyBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const caseStudy = await prisma.caseStudy.findUnique({
    where: { slug },
    include: {
      project: {
        select: { id: true, title: true },
      },
    },
  });

  if (!caseStudy || caseStudy.status !== 'published') {
    throw new ApiError(404, 'Case study not found');
  }

  res.json({
    success: true,
    data: caseStudy,
  });
});

/**
 * Create case study
 */
export const createCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    slug,
    clientName,
    challenge,
    solution,
    results,
    images,
    category,
    projectId,
    status = 'draft',
  } = req.body;

  // Check slug uniqueness
  const existing = await prisma.caseStudy.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(400, 'Slug already exists');
  }

  const caseStudy = await prisma.caseStudy.create({
    data: {
      title,
      slug,
      clientName,
      challenge,
      solution,
      results,
      images,
      category,
      projectId,
      status,
    },
  });

  logger.info(`Case study created: ${caseStudy.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: caseStudy,
    message: 'Case study created',
  });
});

/**
 * Update case study
 */
export const updateCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const caseStudy = await prisma.caseStudy.findUnique({ where: { id } });
  if (!caseStudy) {
    throw new ApiError(404, 'Case study not found');
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== caseStudy.slug) {
    const existing = await prisma.caseStudy.findUnique({ where: { slug: updates.slug } });
    if (existing) {
      throw new ApiError(400, 'Slug already exists');
    }
  }

  const updated = await prisma.caseStudy.update({
    where: { id },
    data: updates,
  });

  res.json({
    success: true,
    data: updated,
    message: 'Case study updated',
  });
});

/**
 * Delete case study
 */
export const deleteCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const caseStudy = await prisma.caseStudy.findUnique({ where: { id } });
  if (!caseStudy) {
    throw new ApiError(404, 'Case study not found');
  }

  await prisma.caseStudy.delete({ where: { id } });

  logger.info(`Case study deleted: ${id} by ${req.user!.id}`);

  res.json({
    success: true,
    message: 'Case study deleted',
  });
});

// ==================== PRODUCTS ====================

/**
 * Get products for website
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { category, featured, limit = 20 } = req.query;

  const where: any = { isActive: true };
  
  if (category) {
    where.category = category;
  }

  const products = await prisma.product.findMany({
    where,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      basePrice: true,
      images: true,
      specifications: true,
    },
  });

  res.json({
    success: true,
    data: products,
  });
});

/**
 * Create product
 */
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    category,
    description,
    basePrice,
    images,
    specifications,
    isActive = true,
  } = req.body;

  const product = await prisma.product.create({
    data: {
      name,
      category,
      description,
      basePrice,
      images: images || [],
      specifications: specifications || {},
      isActive,
    },
  });

  logger.info(`Product created: ${product.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: product,
    message: 'Product created',
  });
});
