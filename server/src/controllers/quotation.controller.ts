/**
 * Quotation Controller
 * Admin-facing quotation builder with configurable product templates
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { UserRole } from '../middleware/auth.js';
import { sendEmail } from '../services/email.service.js';
import { generatePDF } from '../services/pdf.service.js';
import { logger } from '../utils/logger.js';

// Generate unique quote number
async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
      },
    },
  });
  return `BQ-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Get all quotations
 * Admin: all quotations
 * Customer: own quotations only
 */
export const getQuotations = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20', search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Build where clause based on role
  const where: any = {};

  if (req.user?.role === UserRole.CUSTOMER) {
    where.customerId = req.userId;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { quoteNumber: { contains: search as string, mode: 'insensitive' } },
      { title: { contains: search as string, mode: 'insensitive' } },
      { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            companyName: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            category: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      quotations,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    },
  });
});

/**
 * Get single quotation by ID
 */
export const getQuotationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          address: true,
          city: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      inquiry: true,
    },
  });

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found');
  }

  // Check access
  if (
    req.user?.role === UserRole.CUSTOMER &&
    quotation.customerId !== req.userId
  ) {
    throw new ApiError(403, 'Access denied');
  }

  // Mark as viewed if customer
  if (
    req.user?.role === UserRole.CUSTOMER &&
    quotation.status === 'sent' &&
    !quotation.viewedAt
  ) {
    await prisma.quotation.update({
      where: { id },
      data: { viewedAt: new Date(), status: 'viewed' },
    });
  }

  res.json({
    success: true,
    data: { quotation },
  });
});

/**
 * Create new quotation (Admin only)
 */
export const createQuotation = asyncHandler(async (req: Request, res: Response) => {
  const {
    customerId,
    inquiryId,
    title,
    description,
    items,
    taxRate = 0,
    discount = 0,
    validUntil,
    internalNotes,
    customerNotes,
    termsConditions,
  } = req.body;

  // Verify customer exists
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  // Calculate totals
  let subtotal = 0;
  const processedItems = items.map((item: any, index: number) => {
    const totalPrice = parseFloat(item.unitPrice) * parseInt(item.quantity);
    subtotal += totalPrice;
    return {
      ...item,
      totalPrice,
      sortOrder: index,
    };
  });

  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount - parseFloat(discount);

  // Generate quote number
  const quoteNumber = await generateQuoteNumber();

  // Create quotation with items
  const quotation = await prisma.quotation.create({
    data: {
      quoteNumber,
      customerId,
      createdById: req.userId!,
      inquiryId,
      title,
      description,
      subtotal,
      taxRate: parseFloat(taxRate),
      taxAmount,
      discount: parseFloat(discount),
      total,
      validUntil: validUntil ? new Date(validUntil) : null,
      internalNotes,
      customerNotes,
      termsConditions: termsConditions || getDefaultTerms(),
      items: {
        create: processedItems.map((item: any) => ({
          productId: item.productId || null,
          name: item.name,
          description: item.description,
          category: item.category,
          specifications: item.specifications,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          materialCost: item.materialCost,
          laborCost: item.laborCost,
          margin: item.margin,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: true,
    },
  });

  // Update inquiry status if linked
  if (inquiryId) {
    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: 'quoted' },
    });
  }

  logger.info(`Quotation created: ${quoteNumber} by ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Quotation created successfully',
    data: { quotation },
  });
});

/**
 * Update quotation (Admin only)
 */
export const updateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    items,
    taxRate,
    discount,
    validUntil,
    internalNotes,
    customerNotes,
    termsConditions,
  } = req.body;

  // Check quotation exists and is editable
  const existing = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, 'Quotation not found');
  }

  if (['accepted', 'rejected'].includes(existing.status)) {
    throw new ApiError(400, 'Cannot edit accepted or rejected quotation');
  }

  // Recalculate totals if items provided
  let subtotal = existing.subtotal.toNumber();
  let processedItems;

  if (items) {
    subtotal = 0;
    processedItems = items.map((item: any, index: number) => {
      const totalPrice = parseFloat(item.unitPrice) * parseInt(item.quantity);
      subtotal += totalPrice;
      return {
        ...item,
        totalPrice,
        sortOrder: index,
      };
    });
  }

  const actualTaxRate = taxRate !== undefined ? parseFloat(taxRate) : existing.taxRate.toNumber();
  const actualDiscount = discount !== undefined ? parseFloat(discount) : existing.discount.toNumber();
  const taxAmount = subtotal * (actualTaxRate / 100);
  const total = subtotal + taxAmount - actualDiscount;

  // Update quotation
  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      subtotal,
      taxRate: actualTaxRate,
      taxAmount,
      discount: actualDiscount,
      total,
      validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
      internalNotes: internalNotes !== undefined ? internalNotes : existing.internalNotes,
      customerNotes: customerNotes !== undefined ? customerNotes : existing.customerNotes,
      termsConditions: termsConditions !== undefined ? termsConditions : existing.termsConditions,
      version: existing.version + 1,
      status: existing.status === 'sent' ? 'revised' : existing.status,
    },
    include: {
      customer: true,
      items: true,
    },
  });

  // Update items if provided
  if (processedItems) {
    // Delete existing items
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id },
    });

    // Create new items
    await prisma.quotationItem.createMany({
      data: processedItems.map((item: any) => ({
        quotationId: id,
        productId: item.productId || null,
        name: item.name,
        description: item.description,
        category: item.category,
        specifications: item.specifications,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        materialCost: item.materialCost,
        laborCost: item.laborCost,
        margin: item.margin,
        sortOrder: item.sortOrder,
      })),
    });
  }

  res.json({
    success: true,
    message: 'Quotation updated successfully',
    data: { quotation },
  });
});

/**
 * Send quotation to customer (Admin only)
 */
export const sendQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found');
  }

  if (quotation.status === 'accepted') {
    throw new ApiError(400, 'Quotation already accepted');
  }

  // Generate PDF
  const pdfBuffer = await generatePDF('quotation', quotation);

  // Send email
  await sendEmail({
    to: quotation.customer.email,
    subject: `Your Quote from BaoMbao Craft - ${quotation.quoteNumber}`,
    template: 'quotation',
    data: {
      customerName: quotation.customer.firstName,
      quoteNumber: quotation.quoteNumber,
      quoteTitle: quotation.title,
      total: quotation.total.toNumber().toLocaleString(),
      currency: quotation.currency,
      validUntil: quotation.validUntil?.toLocaleDateString(),
      viewUrl: `${process.env.FRONTEND_URL}/account/quotes/${quotation.id}`,
      message,
    },
    attachments: [
      {
        filename: `${quotation.quoteNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  // Update status
  await prisma.quotation.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });

  logger.info(`Quotation ${quotation.quoteNumber} sent to ${quotation.customer.email}`);

  res.json({
    success: true,
    message: 'Quotation sent successfully',
  });
});

/**
 * Customer accepts quotation
 */
export const acceptQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found');
  }

  // Verify ownership
  if (quotation.customerId !== req.userId) {
    throw new ApiError(403, 'Access denied');
  }

  if (quotation.status === 'accepted') {
    throw new ApiError(400, 'Quotation already accepted');
  }

  if (quotation.validUntil && quotation.validUntil < new Date()) {
    throw new ApiError(400, 'Quotation has expired');
  }

  // Update quotation
  await prisma.quotation.update({
    where: { id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      customerNotes: notes,
    },
  });

  // Create project
  const projectNumber = `BP-${new Date().getFullYear()}-${String(
    (await prisma.project.count()) + 1
  ).padStart(4, '0')}`;

  const project = await prisma.project.create({
    data: {
      projectNumber,
      customerId: quotation.customerId,
      quotationId: quotation.id,
      name: quotation.title,
      description: quotation.description,
      category: 'other', // Will be updated based on items
      status: 'pending',
      milestones: {
        create: [
          { name: 'Quote Accepted', status: 'completed', completedAt: new Date(), sortOrder: 0 },
          { name: 'Design Approval', status: 'pending', sortOrder: 1 },
          { name: 'Production Started', status: 'pending', sortOrder: 2 },
          { name: 'Quality Check', status: 'pending', sortOrder: 3 },
          { name: 'Ready for Delivery', status: 'pending', sortOrder: 4 },
          { name: 'Installation', status: 'pending', sortOrder: 5 },
          { name: 'Project Complete', status: 'pending', sortOrder: 6 },
        ],
      },
    },
  });

  logger.info(`Quotation ${quotation.quoteNumber} accepted, project ${projectNumber} created`);

  res.json({
    success: true,
    message: 'Quotation accepted. Your project has been created.',
    data: { projectId: project.id },
  });
});

/**
 * Customer rejects quotation
 */
export const rejectQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found');
  }

  // Verify ownership
  if (quotation.customerId !== req.userId) {
    throw new ApiError(403, 'Access denied');
  }

  await prisma.quotation.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  res.json({
    success: true,
    message: 'Quotation rejected',
  });
});

/**
 * Duplicate quotation
 */
export const duplicateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { customerId } = req.body;

  const original = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!original) {
    throw new ApiError(404, 'Quotation not found');
  }

  const quoteNumber = await generateQuoteNumber();

  const newQuotation = await prisma.quotation.create({
    data: {
      quoteNumber,
      customerId: customerId || original.customerId,
      createdById: req.userId!,
      title: `Copy of ${original.title}`,
      description: original.description,
      subtotal: original.subtotal,
      taxRate: original.taxRate,
      taxAmount: original.taxAmount,
      discount: original.discount,
      total: original.total,
      termsConditions: original.termsConditions,
      parentQuoteId: original.id,
      items: {
        create: original.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          description: item.description,
          category: item.category,
          specifications: item.specifications,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          materialCost: item.materialCost,
          laborCost: item.laborCost,
          margin: item.margin,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { items: true },
  });

  res.status(201).json({
    success: true,
    message: 'Quotation duplicated',
    data: { quotation: newQuotation },
  });
});

/**
 * Generate quotation PDF
 */
export const generateQuotationPDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found');
  }

  // Check access
  if (
    req.user?.role === UserRole.CUSTOMER &&
    quotation.customerId !== req.userId
  ) {
    throw new ApiError(403, 'Access denied');
  }

  const pdfBuffer = await generatePDF('quotation', quotation);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${quotation.quoteNumber}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * Get quotation templates
 */
export const getQuotationTemplates = asyncHandler(async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { category: 'asc' },
  });

  // Group by category
  const templates = products.reduce((acc: any, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  res.json({
    success: true,
    data: { templates },
  });
});

// Default terms and conditions
function getDefaultTerms(): string {
  return `
1. QUOTATION VALIDITY: This quotation is valid for 30 days from the date of issue.

2. PAYMENT TERMS: 50% deposit required to commence work. Balance due upon completion before installation.

3. DELIVERY: Delivery timeline begins upon receipt of deposit and design approval.

4. CHANGES: Any changes after design approval may incur additional charges and affect delivery timeline.

5. WARRANTY: 2-year warranty on craftsmanship. Hardware covered by manufacturer warranty.

6. INSTALLATION: Professional installation included. Site must be accessible and prepared.

7. CANCELLATION: Cancellation after production begins may result in forfeit of deposit.
  `.trim();
}
