import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ==================== DASHBOARD ====================

/**
 * Get admin dashboard overview stats
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    newCustomersThisMonth,
    activeProjects,
    pendingQuotes,
    recentPayments,
    pendingInquiries,
    lowStockCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'customer' } }),
    prisma.user.count({
      where: { role: 'customer', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.project.count({ where: { status: 'in_progress' } }),
    prisma.quotation.count({ where: { status: 'sent' } }),
    prisma.payment.aggregate({
      where: { status: 'completed', createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.inquiry.count({ where: { status: 'pending' } }),
    prisma.material.count({
      where: {
        currentStock: { lte: prisma.material.fields.minStockLevel },
      },
    }),
  ]);

  // Quote conversion rate
  const quoteStats = await prisma.quotation.groupBy({
    by: ['status'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  const totalQuotes = quoteStats.reduce((sum, s) => sum + s._count, 0);
  const acceptedQuotes = quoteStats.find(s => s.status === 'accepted')?._count || 0;
  const conversionRate = totalQuotes > 0 
    ? Math.round((acceptedQuotes / totalQuotes) * 100) 
    : 0;

  // Recent activity
  const recentProjects = await prisma.project.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      customer: { select: { name: true } },
    },
  });

  res.json({
    success: true,
    data: {
      overview: {
        totalCustomers,
        newCustomersThisMonth,
        activeProjects,
        pendingQuotes,
        pendingInquiries,
        lowStockCount,
      },
      revenue: {
        last30Days: recentPayments._sum.amount?.toNumber() || 0,
        transactionCount: recentPayments._count,
      },
      quotes: {
        total: totalQuotes,
        accepted: acceptedQuotes,
        conversionRate: `${conversionRate}%`,
      },
      recentProjects,
    },
  });
});

/**
 * Get partner dashboard stats
 */
export const getPartnerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const partnerId = req.user!.id;

  const [assignedProjects, completedProjects, pendingMilestones] = await Promise.all([
    prisma.project.findMany({
      where: { assignedTo: partnerId, status: { in: ['pending', 'in_progress'] } },
      include: {
        customer: { select: { name: true, phone: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.project.count({
      where: { assignedTo: partnerId, status: 'completed' },
    }),
    prisma.projectMilestone.count({
      where: {
        project: { assignedTo: partnerId },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      activeProjects: assignedProjects.length,
      completedProjects,
      pendingMilestones,
      projects: assignedProjects,
    },
  });
});

// ==================== REVENUE ====================

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'month', startDate, endDate } = req.query;

  let dateFrom = new Date();
  const dateTo = endDate ? new Date(String(endDate)) : new Date();

  if (startDate) {
    dateFrom = new Date(String(startDate));
  } else {
    switch (period) {
      case 'day':
        dateFrom.setDate(dateFrom.getDate() - 1);
        break;
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(dateFrom.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
    }
  }

  const payments = await prisma.payment.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    select: {
      amount: true,
      paymentMethod: true,
      createdAt: true,
    },
  });

  // Total revenue
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

  // By payment method
  const byMethod = payments.reduce((acc, p) => {
    const method = p.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + p.amount.toNumber();
    return acc;
  }, {} as Record<string, number>);

  // Daily breakdown
  const daily = payments.reduce((acc, p) => {
    const day = p.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + p.amount.toNumber();
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      period: { from: dateFrom, to: dateTo },
      totalRevenue,
      transactionCount: payments.length,
      averageTransaction: payments.length > 0 ? totalRevenue / payments.length : 0,
      byPaymentMethod: byMethod,
      daily: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
    },
  });
});

// ==================== QUOTATIONS ====================

/**
 * Get quotation analytics
 */
export const getQuotationAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  let dateFrom = new Date();
  switch (period) {
    case 'week':
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case 'month':
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      break;
    case 'quarter':
      dateFrom.setMonth(dateFrom.getMonth() - 3);
      break;
    case 'year':
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
  }

  const quotes = await prisma.quotation.findMany({
    where: { createdAt: { gte: dateFrom } },
    select: {
      status: true,
      total: true,
      createdAt: true,
      sentAt: true,
      acceptedAt: true,
    },
  });

  // Status breakdown
  const byStatus = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Value by status
  const valueByStatus = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + q.total.toNumber();
    return acc;
  }, {} as Record<string, number>);

  // Response times
  const quotesWithResponse = quotes.filter(q => q.sentAt && q.acceptedAt);
  const avgResponseTime = quotesWithResponse.length > 0
    ? quotesWithResponse.reduce((sum, q) => {
        const diff = q.acceptedAt!.getTime() - q.sentAt!.getTime();
        return sum + diff;
      }, 0) / quotesWithResponse.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;

  // Conversion funnel
  const sent = quotes.filter(q => q.sentAt).length;
  const accepted = quotes.filter(q => q.status === 'accepted').length;
  const rejected = quotes.filter(q => q.status === 'rejected').length;

  res.json({
    success: true,
    data: {
      total: quotes.length,
      byStatus,
      valueByStatus,
      conversionRate: sent > 0 ? `${Math.round((accepted / sent) * 100)}%` : '0%',
      rejectionRate: sent > 0 ? `${Math.round((rejected / sent) * 100)}%` : '0%',
      averageResponseTimeDays: Math.round(avgResponseTime * 10) / 10,
      averageQuoteValue: quotes.length > 0
        ? quotes.reduce((sum, q) => sum + q.total.toNumber(), 0) / quotes.length
        : 0,
    },
  });
});

// ==================== LEAD SCORING ====================

/**
 * Get lead analytics
 */
export const getLeadAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const leads = await prisma.leadScore.findMany({
    include: {
      inquiry: {
        select: { name: true, email: true, phone: true, productInterest: true },
      },
    },
    orderBy: { totalScore: 'desc' },
  });

  // Score distribution
  const distribution = {
    hot: leads.filter(l => l.totalScore >= 80).length,
    warm: leads.filter(l => l.totalScore >= 50 && l.totalScore < 80).length,
    cold: leads.filter(l => l.totalScore < 50).length,
  };

  // Average scores
  const avgScore = leads.length > 0
    ? leads.reduce((sum, l) => sum + l.totalScore, 0) / leads.length
    : 0;

  res.json({
    success: true,
    data: {
      totalLeads: leads.length,
      distribution,
      averageScore: Math.round(avgScore),
      topLeads: leads.slice(0, 10),
    },
  });
});

/**
 * Get top leads
 */
export const getTopLeads = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  const leads = await prisma.leadScore.findMany({
    take: Number(limit),
    orderBy: { totalScore: 'desc' },
    include: {
      inquiry: {
        select: {
          name: true,
          email: true,
          phone: true,
          productInterest: true,
          createdAt: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: leads.map(lead => ({
      ...lead,
      category: 
        lead.totalScore >= 80 ? 'hot' :
        lead.totalScore >= 50 ? 'warm' : 'cold',
    })),
  });
});

// ==================== PROJECTS ====================

/**
 * Get project analytics
 */
export const getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  let dateFrom = new Date();
  switch (period) {
    case 'month':
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      break;
    case 'quarter':
      dateFrom.setMonth(dateFrom.getMonth() - 3);
      break;
    case 'year':
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
  }

  const projects = await prisma.project.findMany({
    where: { createdAt: { gte: dateFrom } },
    include: {
      milestones: true,
      payments: { where: { status: 'completed' } },
    },
  });

  // Status distribution
  const byStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // On-time completion rate
  const completed = projects.filter(p => p.status === 'completed' && p.actualEndDate);
  const onTime = completed.filter(p => 
    p.estimatedEndDate && p.actualEndDate! <= p.estimatedEndDate
  ).length;
  const onTimeRate = completed.length > 0
    ? Math.round((onTime / completed.length) * 100)
    : 0;

  // Average project value
  const avgValue = projects.length > 0
    ? projects.reduce((sum, p) => sum + (p.budget?.toNumber() || 0), 0) / projects.length
    : 0;

  // Payment collection rate
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget?.toNumber() || 0), 0);
  const totalCollected = projects.reduce(
    (sum, p) => sum + p.payments.reduce((pSum, pay) => pSum + pay.amount.toNumber(), 0),
    0
  );
  const collectionRate = totalBudget > 0
    ? Math.round((totalCollected / totalBudget) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      total: projects.length,
      byStatus,
      completed: completed.length,
      onTimeCompletionRate: `${onTimeRate}%`,
      averageProjectValue: avgValue,
      paymentCollectionRate: `${collectionRate}%`,
      totalBudget,
      totalCollected,
    },
  });
});

// ==================== PRODUCTS ====================

/**
 * Get product performance analytics
 */
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const quotationItems = await prisma.quotationItem.findMany({
    include: {
      product: {
        select: { name: true, category: true },
      },
      quotation: {
        select: { status: true },
      },
    },
  });

  // Products by quote frequency
  const productStats = quotationItems.reduce((acc, item) => {
    const productName = item.product?.name || item.productName;
    const category = item.product?.category || 'custom';
    
    if (!acc[productName]) {
      acc[productName] = {
        name: productName,
        category,
        quoteCount: 0,
        acceptedCount: 0,
        totalValue: 0,
      };
    }
    
    acc[productName].quoteCount += 1;
    if (item.quotation.status === 'accepted') {
      acc[productName].acceptedCount += 1;
    }
    acc[productName].totalValue += item.totalPrice.toNumber();
    
    return acc;
  }, {} as Record<string, any>);

  const products = Object.values(productStats)
    .sort((a: any, b: any) => b.quoteCount - a.quoteCount);

  // Category breakdown
  const byCategory = products.reduce((acc: any, p: any) => {
    if (!acc[p.category]) {
      acc[p.category] = { count: 0, value: 0 };
    }
    acc[p.category].count += p.quoteCount;
    acc[p.category].value += p.totalValue;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      topProducts: products.slice(0, 10),
      byCategory,
      totalProducts: products.length,
    },
  });
});

// ==================== CUSTOMERS ====================

/**
 * Get customer analytics
 */
export const getCustomerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    include: {
      projects: {
        include: {
          payments: { where: { status: 'completed' } },
        },
      },
      quotations: true,
    },
  });

  // Customer value analysis
  const customerValues = customers.map(c => {
    const totalSpent = c.projects.reduce(
      (sum, p) => sum + p.payments.reduce((pSum, pay) => pSum + pay.amount.toNumber(), 0),
      0
    );
    return {
      id: c.id,
      name: c.name,
      projectCount: c.projects.length,
      quoteCount: c.quotations.length,
      totalSpent,
    };
  });

  // Sort by total spent
  customerValues.sort((a, b) => b.totalSpent - a.totalSpent);

  // New vs returning
  const withProjects = customers.filter(c => c.projects.length > 0);
  const repeatCustomers = customers.filter(c => c.projects.length > 1);

  // Acquisition trend (by month)
  const acquisitionByMonth = customers.reduce((acc, c) => {
    const month = c.createdAt.toISOString().slice(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      total: customers.length,
      withProjects: withProjects.length,
      repeatCustomers: repeatCustomers.length,
      repeatRate: customers.length > 0
        ? `${Math.round((repeatCustomers.length / withProjects.length) * 100)}%`
        : '0%',
      topCustomers: customerValues.slice(0, 10),
      acquisitionByMonth,
    },
  });
});

// ==================== EVENT TRACKING ====================

/**
 * Track analytics event (public endpoint)
 */
export const trackEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventType, eventData, sessionId } = req.body;

  if (!eventType) {
    throw new ApiError(400, 'Event type required');
  }

  await prisma.analyticsEvent.create({
    data: {
      eventType,
      eventData: eventData || {},
      userId: req.user?.id || null,
      sessionId: sessionId || null,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    },
  });

  res.json({ success: true });
});

/**
 * Get events data
 */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { eventType, startDate, endDate } = req.query;

  const where: any = {};
  
  if (eventType) {
    where.eventType = eventType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const events = await prisma.analyticsEvent.groupBy({
    by: ['eventType'],
    where,
    _count: true,
  });

  res.json({
    success: true,
    data: events,
  });
});
