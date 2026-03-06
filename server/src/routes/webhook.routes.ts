import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { smsService } from '../services/sms.service.js';
import { emailService } from '../services/email.service.js';

const router = Router();

/**
 * MTN Mobile Money Callback
 * @route POST /api/v1/webhooks/mtn-momo
 */
router.post('/mtn-momo', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    logger.info('MTN MoMo webhook received:', JSON.stringify(payload));

    // Extract transaction details
    const externalId = payload.externalId;
    const status = payload.status; // SUCCESSFUL, FAILED, PENDING
    const financialTransactionId = payload.financialTransactionId;
    const reason = payload.reason;

    if (!externalId) {
      logger.warn('MTN MoMo webhook: Missing externalId');
      return res.status(200).json({ received: true });
    }

    // Find the payment
    const payment = await prisma.payment.findFirst({
      where: { transactionRef: externalId },
      include: {
        customer: true,
        project: true,
      },
    });

    if (!payment) {
      logger.warn(`MTN MoMo webhook: Payment not found for ref ${externalId}`);
      return res.status(200).json({ received: true });
    }

    // Update payment status
    let newStatus: 'pending' | 'completed' | 'failed' = 'pending';
    
    if (status === 'SUCCESSFUL') {
      newStatus = 'completed';
    } else if (status === 'FAILED') {
      newStatus = 'failed';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        providerRef: financialTransactionId,
        metadata: {
          ...(payment.metadata as object || {}),
          webhookResponse: payload,
          completedAt: new Date().toISOString(),
        },
      },
    });

    // Send notifications on success
    if (newStatus === 'completed') {
      // SMS notification
      if (payment.customer.phone) {
        await smsService.sendPaymentConfirmation(
          payment.customer.phone,
          payment.amount.toNumber(),
          payment.transactionRef
        );
      }

      // Email notification
      if (payment.customer.email) {
        await emailService.sendPaymentConfirmation(
          payment.customer.email,
          payment.customer.name,
          payment.amount.toNumber(),
          payment.transactionRef,
          payment.project?.title
        );
      }

      // Create notification
      await prisma.notification.create({
        data: {
          userId: payment.customerId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of UGX ${payment.amount.toLocaleString()} was successful.`,
          data: {
            paymentId: payment.id,
            amount: payment.amount.toNumber(),
          },
        },
      });

      logger.info(`Payment completed: ${payment.id} via MTN MoMo`);
    } else if (newStatus === 'failed') {
      // Notify customer of failure
      await prisma.notification.create({
        data: {
          userId: payment.customerId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your payment of UGX ${payment.amount.toLocaleString()} failed. ${reason || 'Please try again.'}`,
          data: {
            paymentId: payment.id,
            reason,
          },
        },
      });

      logger.info(`Payment failed: ${payment.id} - ${reason}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('MTN MoMo webhook error:', error);
    res.status(200).json({ received: true }); // Always return 200 to prevent retries
  }
});

/**
 * Airtel Money Callback
 * @route POST /api/v1/webhooks/airtel
 */
router.post('/airtel', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    logger.info('Airtel Money webhook received:', JSON.stringify(payload));

    // Extract transaction details
    const transactionId = payload.transaction?.id;
    const status = payload.transaction?.status; // TS (Success), TF (Failed), TIP (In Progress)
    const airtelMoneyId = payload.transaction?.airtel_money_id;
    const message = payload.transaction?.message;

    if (!transactionId) {
      logger.warn('Airtel webhook: Missing transaction ID');
      return res.status(200).json({ received: true });
    }

    // Find the payment
    const payment = await prisma.payment.findFirst({
      where: { transactionRef: transactionId },
      include: {
        customer: true,
        project: true,
      },
    });

    if (!payment) {
      logger.warn(`Airtel webhook: Payment not found for ref ${transactionId}`);
      return res.status(200).json({ received: true });
    }

    // Update payment status
    let newStatus: 'pending' | 'completed' | 'failed' = 'pending';
    
    if (status === 'TS') {
      newStatus = 'completed';
    } else if (status === 'TF') {
      newStatus = 'failed';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        providerRef: airtelMoneyId,
        metadata: {
          ...(payment.metadata as object || {}),
          webhookResponse: payload,
          completedAt: new Date().toISOString(),
        },
      },
    });

    // Send notifications on success
    if (newStatus === 'completed') {
      if (payment.customer.phone) {
        await smsService.sendPaymentConfirmation(
          payment.customer.phone,
          payment.amount.toNumber(),
          payment.transactionRef
        );
      }

      if (payment.customer.email) {
        await emailService.sendPaymentConfirmation(
          payment.customer.email,
          payment.customer.name,
          payment.amount.toNumber(),
          payment.transactionRef,
          payment.project?.title
        );
      }

      await prisma.notification.create({
        data: {
          userId: payment.customerId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of UGX ${payment.amount.toLocaleString()} was successful.`,
          data: {
            paymentId: payment.id,
            amount: payment.amount.toNumber(),
          },
        },
      });

      logger.info(`Payment completed: ${payment.id} via Airtel Money`);
    } else if (newStatus === 'failed') {
      await prisma.notification.create({
        data: {
          userId: payment.customerId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your payment of UGX ${payment.amount.toLocaleString()} failed. ${message || 'Please try again.'}`,
          data: {
            paymentId: payment.id,
            reason: message,
          },
        },
      });

      logger.info(`Payment failed: ${payment.id} - ${message}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Airtel webhook error:', error);
    res.status(200).json({ received: true });
  }
});

/**
 * Flutterwave/Card Payment Callback
 * @route POST /api/v1/webhooks/flutterwave
 */
router.post('/flutterwave', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers['verif-hash'];
    
    if (secretHash && signature !== secretHash) {
      logger.warn('Flutterwave webhook: Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body;
    logger.info('Flutterwave webhook received:', JSON.stringify(payload));

    const txRef = payload.data?.tx_ref;
    const status = payload.data?.status;
    const flwRef = payload.data?.flw_ref;

    if (!txRef) {
      return res.status(200).json({ received: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { transactionRef: txRef },
      include: {
        customer: true,
        project: true,
      },
    });

    if (!payment) {
      return res.status(200).json({ received: true });
    }

    let newStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (status === 'successful') {
      newStatus = 'completed';
    } else if (status === 'failed') {
      newStatus = 'failed';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        providerRef: flwRef,
        metadata: {
          ...(payment.metadata as object || {}),
          webhookResponse: payload.data,
        },
      },
    });

    if (newStatus === 'completed') {
      if (payment.customer.email) {
        await emailService.sendPaymentConfirmation(
          payment.customer.email,
          payment.customer.name,
          payment.amount.toNumber(),
          payment.transactionRef,
          payment.project?.title
        );
      }

      await prisma.notification.create({
        data: {
          userId: payment.customerId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your card payment of UGX ${payment.amount.toLocaleString()} was successful.`,
          data: { paymentId: payment.id },
        },
      });
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Flutterwave webhook error:', error);
    res.status(200).json({ received: true });
  }
});

export default router;
