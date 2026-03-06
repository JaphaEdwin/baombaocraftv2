import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Get all users (admin only)
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search) } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            quotations: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
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
 * Get single user
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requestingUser = req.user!;

  // Only admin or self can view user details
  if (requestingUser.role !== 'admin' && requestingUser.role !== 'super_admin' && requestingUser.id !== id) {
    throw new ApiError(403, 'Access denied');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      address: true,
      isVerified: true,
      createdAt: true,
      projects: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      quotations: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quotationNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          projects: true,
          quotations: true,
          payments: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  const requestingUser = req.user!;

  // Only admin or self can update
  const isAdmin = requestingUser.role === 'admin' || requestingUser.role === 'super_admin';
  if (!isAdmin && requestingUser.id !== id) {
    throw new ApiError(403, 'Access denied');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(address && { address }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      role: true,
    },
  });

  logger.info(`User updated: ${id} by ${requestingUser.id}`);

  res.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully',
  });
});

/**
 * Update user role (super admin only)
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Cannot change super_admin role
  if (user.role === 'super_admin') {
    throw new ApiError(403, 'Cannot modify super admin role');
  }

  // Cannot promote to super_admin via API
  if (role === 'super_admin') {
    throw new ApiError(403, 'Cannot promote to super admin');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  logger.info(`User role changed: ${id} to ${role} by ${req.user!.id}`);

  res.json({
    success: true,
    data: updatedUser,
    message: `User role updated to ${role}`,
  });
});

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Cannot deactivate super_admin
  if (user.role === 'super_admin') {
    throw new ApiError(403, 'Cannot deactivate super admin');
  }

  // Soft delete by updating email (Prisma doesn't have built-in soft delete)
  await prisma.user.update({
    where: { id },
    data: {
      email: `deactivated_${Date.now()}_${user.email}`,
      isVerified: false,
    },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  logger.info(`User deactivated: ${id} by ${req.user!.id}`);

  res.json({
    success: true,
    message: 'User deactivated successfully',
  });
});

/**
 * Get user notifications
 */
export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { unreadOnly } = req.query;

  // Only self can view notifications
  if (req.user!.id !== id) {
    throw new ApiError(403, 'Access denied');
  }

  const where: any = { userId: id };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: id, isRead: false },
  });

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
});

/**
 * Mark notifications as read
 */
export const markNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notificationIds } = req.body;

  // Only self can mark notifications
  if (req.user!.id !== id) {
    throw new ApiError(403, 'Access denied');
  }

  const where: any = { userId: id };
  
  // If specific IDs provided, only mark those
  if (notificationIds && notificationIds.length > 0) {
    where.id = { in: notificationIds };
  }

  await prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });

  res.json({
    success: true,
    message: 'Notifications marked as read',
  });
});
