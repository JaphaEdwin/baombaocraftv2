import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ==================== MATERIALS ====================

/**
 * Get all materials with stock levels
 */
export const getMaterials = asyncHandler(async (req: Request, res: Response) => {
  const { category, lowStock, search, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { sku: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const [materials, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { name: 'asc' },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true },
        },
      },
    }),
    prisma.material.count({ where }),
  ]);

  // Filter low stock if requested
  let resultMaterials = materials;
  if (lowStock === 'true') {
    resultMaterials = materials.filter(
      m => m.currentStock <= (m.minStockLevel || 0)
    );
  }

  // Add stock status
  const materialsWithStatus = resultMaterials.map(material => ({
    ...material,
    stockStatus: 
      material.currentStock <= 0 ? 'out_of_stock' :
      material.currentStock <= (material.minStockLevel || 0) ? 'low' : 'ok',
  }));

  res.json({
    success: true,
    data: {
      materials: materialsWithStatus,
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
 * Get single material with transaction history
 */
export const getMaterialById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      supplier: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          project: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  res.json({
    success: true,
    data: material,
  });
});

/**
 * Create new material
 */
export const createMaterial = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    sku,
    category,
    unit,
    unitCost,
    currentStock = 0,
    minStockLevel = 5,
    supplierId,
    description,
  } = req.body;

  // Check SKU uniqueness
  const existing = await prisma.material.findUnique({ where: { sku } });
  if (existing) {
    throw new ApiError(400, 'SKU already exists');
  }

  // Verify supplier if provided
  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new ApiError(404, 'Supplier not found');
    }
  }

  const material = await prisma.material.create({
    data: {
      name,
      sku,
      category,
      unit,
      unitCost,
      currentStock,
      minStockLevel,
      supplierId,
      description,
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  });

  // Create initial stock transaction if stock > 0
  if (currentStock > 0) {
    await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        type: 'in',
        quantity: currentStock,
        unitCost,
        totalCost: currentStock * unitCost,
        reason: 'Initial stock',
        performedBy: req.user!.id,
      },
    });
  }

  logger.info(`Material created: ${material.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: material,
    message: 'Material created',
  });
});

/**
 * Update material details
 */
export const updateMaterial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  const updated = await prisma.material.update({
    where: { id },
    data: updates,
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  });

  res.json({
    success: true,
    data: updated,
    message: 'Material updated',
  });
});

/**
 * Adjust stock level
 */
export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, quantity, reason, projectId, unitCost } = req.body;

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  // Calculate new stock
  let newStock = material.currentStock;
  const cost = unitCost || material.unitCost.toNumber();

  if (type === 'in') {
    newStock += quantity;
  } else if (type === 'out') {
    if (quantity > material.currentStock) {
      throw new ApiError(400, `Insufficient stock. Available: ${material.currentStock}`);
    }
    newStock -= quantity;
  } else {
    // Adjustment - quantity can be positive or negative
    newStock += quantity;
    if (newStock < 0) {
      throw new ApiError(400, 'Stock cannot be negative');
    }
  }

  // Create transaction and update stock in transaction
  const [transaction] = await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        materialId: id,
        type,
        quantity: Math.abs(quantity),
        unitCost: cost,
        totalCost: Math.abs(quantity) * cost,
        reason,
        projectId,
        balanceAfter: newStock,
        performedBy: req.user!.id,
      },
    }),
    prisma.material.update({
      where: { id },
      data: { currentStock: newStock },
    }),
  ]);

  logger.info(`Stock adjusted: ${id}, ${type} ${quantity}, new balance: ${newStock}`);

  res.json({
    success: true,
    data: {
      transaction,
      newStock,
    },
    message: `Stock ${type === 'in' ? 'added' : type === 'out' ? 'removed' : 'adjusted'}`,
  });
});

// ==================== SUPPLIERS ====================

/**
 * Get all suppliers
 */
export const getSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { materials: true },
      },
    },
  });

  res.json({
    success: true,
    data: suppliers,
  });
});

/**
 * Create supplier
 */
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { name, contactPerson, phone, email, address, categories } = req.body;

  const supplier = await prisma.supplier.create({
    data: {
      name,
      contactPerson,
      phone,
      email,
      address,
      categories: categories || [],
      isActive: true,
    },
  });

  logger.info(`Supplier created: ${supplier.id} by ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: supplier,
    message: 'Supplier created',
  });
});

/**
 * Update supplier
 */
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: updates,
  });

  res.json({
    success: true,
    data: updated,
    message: 'Supplier updated',
  });
});

// ==================== TRANSACTIONS ====================

/**
 * Get inventory transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { materialId, projectId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (materialId) where.materialId = materialId;
  if (projectId) where.projectId = projectId;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        material: {
          select: { id: true, name: true, sku: true, unit: true },
        },
        project: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// ==================== REPORTS ====================

/**
 * Get low stock alerts
 */
export const getLowStockReport = asyncHandler(async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany({
    orderBy: { currentStock: 'asc' },
    include: {
      supplier: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  const lowStockItems = materials.filter(
    m => m.currentStock <= (m.minStockLevel || 0)
  );

  const categorized = {
    outOfStock: lowStockItems.filter(m => m.currentStock === 0),
    critical: lowStockItems.filter(m => m.currentStock > 0 && m.currentStock <= (m.minStockLevel || 0) / 2),
    low: lowStockItems.filter(m => m.currentStock > (m.minStockLevel || 0) / 2),
  };

  res.json({
    success: true,
    data: {
      total: lowStockItems.length,
      ...categorized,
    },
  });
});

/**
 * Get inventory valuation
 */
export const getValuationReport = asyncHandler(async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      currentStock: true,
      unitCost: true,
      unit: true,
    },
  });

  const valuation = materials.map(m => ({
    ...m,
    totalValue: m.currentStock * m.unitCost.toNumber(),
  }));

  // Group by category
  const byCategory = valuation.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { items: 0, value: 0 };
    }
    acc[cat].items += 1;
    acc[cat].value += item.totalValue;
    return acc;
  }, {} as Record<string, { items: number; value: number }>);

  const totalValue = valuation.reduce((sum, item) => sum + item.totalValue, 0);

  res.json({
    success: true,
    data: {
      totalValue,
      totalItems: materials.length,
      byCategory,
      items: valuation,
    },
  });
});

/**
 * Get material usage by project
 */
export const getUsageReport = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const where: any = { type: 'out' };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      material: {
        select: { name: true, category: true, unit: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
  });

  // Group by project
  const byProject = transactions.reduce((acc, tx) => {
    const projectKey = tx.projectId || 'unassigned';
    const projectTitle = tx.project?.title || 'Unassigned';
    
    if (!acc[projectKey]) {
      acc[projectKey] = {
        projectId: tx.projectId,
        projectTitle,
        materials: [],
        totalCost: 0,
      };
    }
    
    acc[projectKey].materials.push({
      material: tx.material.name,
      quantity: tx.quantity,
      unit: tx.material.unit,
      cost: tx.totalCost.toNumber(),
    });
    acc[projectKey].totalCost += tx.totalCost.toNumber();
    
    return acc;
  }, {} as Record<string, any>);

  // Group by material
  const byMaterial = transactions.reduce((acc, tx) => {
    const materialName = tx.material.name;
    
    if (!acc[materialName]) {
      acc[materialName] = {
        category: tx.material.category,
        unit: tx.material.unit,
        totalQuantity: 0,
        totalCost: 0,
      };
    }
    
    acc[materialName].totalQuantity += tx.quantity;
    acc[materialName].totalCost += tx.totalCost.toNumber();
    
    return acc;
  }, {} as Record<string, any>);

  res.json({
    success: true,
    data: {
      byProject: Object.values(byProject),
      byMaterial,
      totalCost: transactions.reduce((sum, tx) => sum + tx.totalCost.toNumber(), 0),
    },
  });
});
