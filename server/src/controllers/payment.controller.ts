/**
 * Payment Controller
 * Mobile Money & Card Payment Integration
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { UserRole } from '../middleware/auth.js';
import { sendEmail } from '../services/email.service.js';
import { sendSMS } from '../services/sms.service.js';
import { generatePDF } from '../services/pdf.service.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Payment providers
import { MtnMomoService } from '../services/payments/mtn-momo.service.js';
import { AirtelMoneyService } from '../services/payments/airtel-money.service.js';

// Generate payment reference
function generatePaymentRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

/**
 * Get available payment methods
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  const methods = [
    {
      id: 'mtn_momo',
      name: 'MTN Mobile Money',
      description: 'Pay using MTN Mobile Money',
      icon: 'mtn-logo',
      enabled: true,
      minAmount: 1000,
      maxAmount: 5000000,
      currency: 'UGX',
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      description: 'Pay using Airtel Money',
      icon: 'airtel-logo',
      enabled: true,
      minAmount: 1000,
      maxAmount: 5000000,
      currency: 'UGX',
    },
    {
      id: 'card',
      name: 'Card Payment',
      description: 'Pay using Visa, Mastercard, or other cards',
      icon: 'card-logo',
      enabled: true,
      minAmount: 50000,
      maxAmount: 50000000,
      currency: 'UGX',
      supportedCards: ['visa', 'mastercard'],
    },
  ];

  res.json({
    success: true,
    data: { methods },
  });
});

/**
 * Initiate payment
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const {
    projectId,
    quotationId,
    amount,
    method,
    phone,
    paymentType = 'deposit',
  } = req.body;

  // Validate amount
  const parsedAmount = parseFloat(amount);
  if (parsedAmount < 1000) {
    throw new ApiError(400, 'Minimum payment amount is UGX 1,000');
  }

  // Generate payment reference
  const paymentRef = generatePaymentRef();

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      paymentRef,
      projectId,
      customerId: req.userId!,
      amount: parsedAmount,
      currency: 'UGX',
      method,
      paymentType,
      status: 'pending',
    },
  });

  let providerResponse;

  try {
    switch (method) {
      case 'mtn_momo':
        providerResponse = await handleMtnMomoPayment({
          paymentRef,
          amount: parsedAmount,
          phone,
          reason: `BaoMbao Payment - ${paymentRef}`,
        });
        break;

      case 'airtel_money':
        providerResponse = await handleAirtelPayment({
          paymentRef,
          amount: parsedAmount,
          phone,
          reason: `BaoMbao Payment - ${paymentRef}`,
        });
        break;

      case 'card':
        providerResponse = await handleCardPayment({
          paymentRef,
          amount: parsedAmount,
          customerId: req.userId!,
        });
        break;

      default:
        throw new ApiError(400, 'Invalid payment method');
    }

    // Update payment with provider reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: providerResponse.transactionId,
        providerData: providerResponse,
        status: 'processing',
      },
    });

    logger.info(`Payment initiated: ${paymentRef} via ${method}`);

    res.json({
      success: true,
      message: getPaymentInstructions(method),
      data: {
        paymentId: payment.id,
        paymentRef,
        status: 'processing',
        ...providerResponse,
      },
    });
  } catch (error: any) {
    // Update payment as failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        failedAt: new Date(),
        failureReason: error.message,
      },
    });

    throw new ApiError(400, `Payment initiation failed: ${error.message}`);
  }
});

/**
 * Get payment status
 */
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, projectNumber: true, name: true },
      },
    },
  });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  // Check access
  if (req.user?.role === UserRole.CUSTOMER && payment.customerId !== req.userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check with provider if still processing
  if (payment.status === 'processing' && payment.providerRef) {
    const providerStatus = await checkProviderStatus(payment.method, payment.providerRef);
    
    if (providerStatus.status !== 'processing') {
      await prisma.payment.update({
        where: { id },
        data: {
          status: providerStatus.status,
          completedAt: providerStatus.status === 'completed' ? new Date() : undefined,
          failedAt: providerStatus.status === 'failed' ? new Date() : undefined,
          failureReason: providerStatus.failureReason,
        },
      });
      payment.status = providerStatus.status as any;
    }
  }

  res.json({
    success: true,
    data: { payment },
  });
});

/**
 * Get payment history
 */
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, projectId } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};

  // Filter by role
  if (req.user?.role === UserRole.CUSTOMER) {
    where.customerId = req.userId;
  }

  if (status) {
    where.status = status;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      payments,
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
 * Generate payment receipt
 */
export const generateReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.status !== 'completed') {
    throw new ApiError(400, 'Cannot generate receipt for incomplete payment');
  }

  // Check access
  if (req.user?.role === UserRole.CUSTOMER && payment.customerId !== req.userId) {
    throw new ApiError(403, 'Access denied');
  }

  const pdfBuffer = await generatePDF('receipt', payment);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.paymentRef}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * Process payment callback (webhook handler)
 */
export const processPaymentCallback = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.params;
  const payload = req.body;

  logger.info(`Payment callback received from ${provider}`, payload);

  let paymentRef: string;
  let status: 'completed' | 'failed';
  let providerRef: string;

  // Parse callback based on provider
  switch (provider) {
    case 'mtn-momo':
      paymentRef = payload.externalId;
      status = payload.status === 'SUCCESSFUL' ? 'completed' : 'failed';
      providerRef = payload.financialTransactionId;
      break;

    case 'airtel':
      paymentRef = payload.transaction.id;
      status = payload.transaction.status === 'SUCCESS' ? 'completed' : 'failed';
      providerRef = payload.transaction.airtel_money_id;
      break;

    default:
      throw new ApiError(400, 'Unknown payment provider');
  }

  // Find and update payment
  const payment = await prisma.payment.findFirst({
    where: { paymentRef },
    include: {
      customer: true,
      project: true,
    },
  });

  if (!payment) {
    logger.warn(`Payment not found for callback: ${paymentRef}`);
    res.json({ success: true }); // Still respond 200 to webhook
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      providerRef,
      providerData: payload,
      completedAt: status === 'completed' ? new Date() : undefined,
      failedAt: status === 'failed' ? new Date() : undefined,
    },
  });

  // Send notifications on success
  if (status === 'completed') {
    // Send email receipt
    await sendEmail({
      to: payment.customer.email,
      subject: `Payment Received - ${payment.paymentRef}`,
      template: 'payment-received',
      data: {
        customerName: payment.customer.firstName,
        amount: payment.amount.toNumber().toLocaleString(),
        currency: payment.currency,
        paymentRef: payment.paymentRef,
        method: getMethodName(payment.method),
        projectName: payment.project?.name,
      },
    });

    // Send SMS
    if (payment.customer.phone) {
      await sendSMS({
        to: payment.customer.phone,
        message: `BaoMbao: Payment of UGX ${payment.amount.toNumber().toLocaleString()} received. Ref: ${payment.paymentRef}. Thank you!`,
      });
    }

    logger.info(`Payment completed: ${paymentRef}`);
  } else {
    logger.warn(`Payment failed: ${paymentRef}`);
  }

  res.json({ success: true });
});

// ========================================
// Helper Functions
// ========================================

async function handleMtnMomoPayment(data: {
  paymentRef: string;
  amount: number;
  phone: string;
  reason: string;
}): Promise<any> {
  const mtnService = new MtnMomoService();
  return mtnService.requestToPay(data);
}

async function handleAirtelPayment(data: {
  paymentRef: string;
  amount: number;
  phone: string;
  reason: string;
}): Promise<any> {
  const airtelService = new AirtelMoneyService();
  return airtelService.requestPayment(data);
}

async function handleCardPayment(data: {
  paymentRef: string;
  amount: number;
  customerId: string;
}): Promise<any> {
  // Return Stripe/Flutterwave checkout URL
  // Implementation depends on chosen provider
  return {
    transactionId: data.paymentRef,
    checkoutUrl: `${process.env.FRONTEND_URL}/checkout/${data.paymentRef}`,
    instruction: 'Complete payment on the checkout page',
  };
}

async function checkProviderStatus(
  method: string,
  providerRef: string
): Promise<{ status: string; failureReason?: string }> {
  // Check status with provider API
  // For now, return processing
  return { status: 'processing' };
}

function getPaymentInstructions(method: string): string {
  switch (method) {
    case 'mtn_momo':
      return 'You will receive a prompt on your phone. Enter your MTN Mobile Money PIN to complete the payment.';
    case 'airtel_money':
      return 'You will receive a prompt on your phone. Enter your Airtel Money PIN to complete the payment.';
    case 'card':
      return 'Please complete your payment on the secure checkout page.';
    default:
      return 'Please complete your payment.';
  }
}

function getMethodName(method: string): string {
  const names: Record<string, string> = {
    mtn_momo: 'MTN Mobile Money',
    airtel_money: 'Airtel Money',
    card: 'Card Payment',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
  };
  return names[method] || method;
}
