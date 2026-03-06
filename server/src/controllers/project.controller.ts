import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Get projects (filtered by user role)
 */
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query;
  const user = req.user!;
  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause based on role
  const where: any = {};
  
  if (user.role === 'customer') {
    where.customerId = user.id;
  } else if (user.role === 'partner') {
    where.assignedTo = user.id;
  }
  
  if (status) {
    where.status = status;
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        milestones: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            completedDate: true,
          },
        },
        _count: {
          select: { payments: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  // Calculate progress for each project
  const projectsWithProgress = projects.map(project => {
    const completedMilestones = project.milestones.filter(
      m => m.status === 'completed' || m.status === 'approved'
    ).length;
    const progress = project.milestones.length > 0
      ? Math.round((completedMilestones / project.milestones.length) * 100)
      : 0;

    return {
      ...project,
      progress,
    };
  });

  res.json({
    success: true,
    data: {
      projects: projectsWithProgress,
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
 * Get single project with full details
 */
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      quotation: {
        select: { id: true, quotationNumber: true, total: true },
      },
      milestones: {
        orderBy: { order: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
        },
      },
      qaChecklists: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check access
  if (
    user.role === 'customer' && project.customerId !== user.id ||
    user.role === 'partner' && project.assignedTo !== user.id
  ) {
    throw new ApiError(403, 'Access denied');
  }

  // Calculate progress and totals
  const completedMilestones = project.milestones.filter(
    m => m.status === 'completed' || m.status === 'approved'
  ).length;
  const progress = project.milestones.length > 0
    ? Math.round((completedMilestones / project.milestones.length) * 100)
    : 0;

  const totalPaid = project.payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);

  const balance = (project.budget?.toNumber() || 0) - totalPaid;

  res.json({
    success: true,
    data: {
      ...project,
      progress,
      totalPaid,
      balance,
    },
  });
});

/**
 * Create new project
 */
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const {
    quotationId,
    customerId,
    title,
    description,
    startDate,
    estimatedEndDate,
    budget,
  } = req.body;

  // Verify customer exists
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  // If from quotation, get quotation details
  let quotation = null;
  if (quotationId) {
    quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new ApiError(404, 'Quotation not found');
    }
  }

  const project = await prisma.project.create({
    data: {
      customerId,
      quotationId: quotationId || null,
      title,
      description,
      status: 'pending',
      startDate: startDate ? new Date(startDate) : null,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
      budget: budget || quotation?.total || null,
      progressPhotos: [],
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  logger.info(`Project created: ${project.id} by admin ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: project,
    message: 'Project created successfully',
  });
});

/**
 * Update project
 */
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Handle date conversions
  if (updates.startDate) updates.startDate = new Date(updates.startDate);
  if (updates.estimatedEndDate) updates.estimatedEndDate = new Date(updates.estimatedEndDate);
  if (updates.actualEndDate) updates.actualEndDate = new Date(updates.actualEndDate);

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updates,
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      milestones: {
        orderBy: { order: 'asc' },
      },
    },
  });

  // Notify customer of status change
  if (updates.status && updates.status !== project.status) {
    await prisma.notification.create({
      data: {
        userId: project.customerId,
        type: 'project_status',
        title: 'Project Status Updated',
        message: `Your project "${project.title}" status changed to ${updates.status}`,
        data: { projectId: id, newStatus: updates.status },
      },
    });
  }

  res.json({
    success: true,
    data: updatedProject,
    message: 'Project updated',
  });
});

/**
 * Add milestone to project
 */
export const addMilestone = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, dueDate, paymentRequired, order } = req.body;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Get max order if not provided
  let milestoneOrder = order;
  if (milestoneOrder === undefined) {
    const lastMilestone = await prisma.projectMilestone.findFirst({
      where: { projectId: id },
      orderBy: { order: 'desc' },
    });
    milestoneOrder = lastMilestone ? lastMilestone.order + 1 : 0;
  }

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId: id,
      title,
      description,
      status: 'pending',
      dueDate: new Date(dueDate),
      paymentRequired,
      order: milestoneOrder,
    },
  });

  res.status(201).json({
    success: true,
    data: milestone,
    message: 'Milestone added',
  });
});

/**
 * Update milestone
 */
export const updateMilestone = asyncHandler(async (req: Request, res: Response) => {
  const { id, milestoneId } = req.params;
  const updates = req.body;

  const milestone = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, projectId: id },
  });

  if (!milestone) {
    throw new ApiError(404, 'Milestone not found');
  }

  // Handle date conversions
  if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
  if (updates.completedDate) updates.completedDate = new Date(updates.completedDate);

  // Auto-set completed date when marking complete
  if (updates.status === 'completed' && !updates.completedDate) {
    updates.completedDate = new Date();
  }

  const updatedMilestone = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: updates,
  });

  // Get project details for notification
  const project = await prisma.project.findUnique({
    where: { id },
    select: { customerId: true, title: true },
  });

  // Notify customer of milestone completion
  if (updates.status === 'completed' && milestone.status !== 'completed') {
    await prisma.notification.create({
      data: {
        userId: project!.customerId,
        type: 'milestone_complete',
        title: 'Milestone Completed',
        message: `Milestone "${milestone.title}" has been completed in your project "${project!.title}"`,
        data: { projectId: id, milestoneId },
      },
    });
  }

  res.json({
    success: true,
    data: updatedMilestone,
    message: 'Milestone updated',
  });
});

/**
 * Add progress photo
 */
export const addProgressPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { photoUrl, caption, milestoneId } = req.body;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const newPhoto = {
    url: photoUrl,
    caption: caption || '',
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user!.id,
    milestoneId: milestoneId || null,
  };

  const currentPhotos = (project.progressPhotos as any[]) || [];
  
  await prisma.project.update({
    where: { id },
    data: {
      progressPhotos: [...currentPhotos, newPhoto],
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: project.customerId,
      type: 'progress_update',
      title: 'New Progress Photo',
      message: `A new progress photo has been added to your project "${project.title}"`,
      data: { projectId: id, photoUrl },
    },
  });

  res.json({
    success: true,
    data: newPhoto,
    message: 'Progress photo added',
  });
});

/**
 * Get project timeline/activity
 */
export const getProjectTimeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { order: 'asc' },
      },
      payments: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check access
  if (
    user.role === 'customer' && project.customerId !== user.id ||
    user.role === 'partner' && project.assignedTo !== user.id
  ) {
    throw new ApiError(403, 'Access denied');
  }

  // Build timeline from various events
  const timeline: any[] = [];

  // Project created
  timeline.push({
    type: 'project_created',
    date: project.createdAt,
    title: 'Project Created',
    description: `Project "${project.title}" was created`,
  });

  // Milestones
  project.milestones.forEach(milestone => {
    if (milestone.completedDate) {
      timeline.push({
        type: 'milestone_completed',
        date: milestone.completedDate,
        title: 'Milestone Completed',
        description: milestone.title,
        milestoneId: milestone.id,
      });
    }
  });

  // Payments
  project.payments.forEach(payment => {
    timeline.push({
      type: 'payment_received',
      date: payment.createdAt,
      title: 'Payment Received',
      description: `UGX ${payment.amount.toLocaleString()} via ${payment.paymentMethod}`,
      paymentId: payment.id,
    });
  });

  // Progress photos
  const photos = (project.progressPhotos as any[]) || [];
  photos.forEach(photo => {
    timeline.push({
      type: 'photo_added',
      date: new Date(photo.uploadedAt),
      title: 'Progress Photo Added',
      description: photo.caption || 'New progress photo',
      photoUrl: photo.url,
    });
  });

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({
    success: true,
    data: timeline,
  });
});

/**
 * Create QA checklist
 */
export const createQAChecklist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { items } = req.body;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Create all checklist items
  const checklistItems = await Promise.all(
    items.map((item: any) =>
      prisma.qAChecklist.create({
        data: {
          projectId: id,
          itemName: item.name,
          category: item.category || 'general',
          status: 'pending',
        },
      })
    )
  );

  res.status(201).json({
    success: true,
    data: checklistItems,
    message: 'QA checklist created',
  });
});

/**
 * Update QA checklist item
 */
export const updateQAChecklistItem = asyncHandler(async (req: Request, res: Response) => {
  const { id, checklistId } = req.params;
  const { status, notes, photoUrl } = req.body;

  const checklistItem = await prisma.qAChecklist.findFirst({
    where: { id: checklistId, projectId: id },
  });

  if (!checklistItem) {
    throw new ApiError(404, 'Checklist item not found');
  }

  const updated = await prisma.qAChecklist.update({
    where: { id: checklistId },
    data: {
      status,
      notes,
      photoUrl,
      checkedAt: status !== 'pending' ? new Date() : null,
      checkedBy: status !== 'pending' ? req.user!.id : null,
    },
  });

  res.json({
    success: true,
    data: updated,
    message: 'Checklist item updated',
  });
});

/**
 * Complete project
 */
export const completeProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { finalPhotos, customerSignoff } = req.body;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: true,
      payments: {
        where: { status: 'completed' },
      },
    },
  });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Check all milestones are complete
  const incompleteMilestones = project.milestones.filter(
    m => m.status !== 'completed' && m.status !== 'approved'
  );

  if (incompleteMilestones.length > 0) {
    throw new ApiError(400, `${incompleteMilestones.length} milestones are not complete`);
  }

  // Check payment completed
  const totalPaid = project.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const budget = project.budget?.toNumber() || 0;

  if (totalPaid < budget * 0.95) { // Allow 5% tolerance
    throw new ApiError(400, 'Payment not complete. Balance remaining.');
  }

  // Update project
  const currentPhotos = (project.progressPhotos as any[]) || [];
  
  const completedProject = await prisma.project.update({
    where: { id },
    data: {
      status: 'completed',
      actualEndDate: new Date(),
      progressPhotos: finalPhotos 
        ? [
            ...currentPhotos,
            ...finalPhotos.map((url: string) => ({
              url,
              caption: 'Final completion photo',
              uploadedAt: new Date().toISOString(),
              uploadedBy: req.user!.id,
              isFinal: true,
            })),
          ]
        : currentPhotos,
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: project.customerId,
      type: 'project_complete',
      title: 'Project Completed! 🎉',
      message: `Your project "${project.title}" has been completed. We hope you love your new furniture!`,
      data: { projectId: id },
    },
  });

  // TODO: Send completion email with feedback request
  // TODO: Create review request

  logger.info(`Project completed: ${id}`);

  res.json({
    success: true,
    data: completedProject,
    message: 'Project marked as complete',
  });
});
