/**
 * SMS Service
 * Integration with Twilio for SMS notifications
 * Optimized for Uganda market
 */

import { logger } from '../utils/logger.js';

interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SendSmsOptions {
  to: string;
  message: string;
}

export class SmsService {
  private config: SmsConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
    };
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}`;
  }

  /**
   * Format Uganda phone number
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    // Uganda format: +256XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '256' + cleaned.substring(1);
    } else if (!cleaned.startsWith('256')) {
      cleaned = '256' + cleaned;
    }
    
    return '+' + cleaned;
  }

  /**
   * Send SMS
   */
  async send(options: SendSmsOptions): Promise<boolean> {
    const { to, message } = options;

    try {
      const credentials = Buffer.from(
        `${this.config.accountSid}:${this.config.authToken}`
      ).toString('base64');

      const formData = new URLSearchParams();
      formData.append('To', this.formatPhone(to));
      formData.append('From', this.config.fromNumber);
      formData.append('Body', message);

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json() as any;
        logger.info(`SMS sent to ${to}: ${data.sid}`);
        return true;
      }

      const error = await response.json();
      logger.error(`Twilio error: ${JSON.stringify(error)}`);
      return false;

    } catch (error) {
      logger.error('SMS send error:', error);
      return false;
    }
  }

  // ==================== TEMPLATE METHODS ====================

  /**
   * Send OTP verification
   */
  async sendOtp(to: string, code: string): Promise<boolean> {
    return this.send({
      to,
      message: `Your BaoMbao Craft verification code is: ${code}. Valid for 10 minutes.`,
    });
  }

  /**
   * Send quotation notification
   */
  async sendQuotationReady(to: string, customerName: string, quotationNumber: string): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, your quotation ${quotationNumber} from BaoMbao Craft is ready! Check your email or log in to view it.`,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(
    to: string,
    customerName: string,
    amount: number,
    projectTitle: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, a payment of UGX ${amount.toLocaleString()} is due for "${projectTitle}". Pay via MTN MoMo or your account. Questions? Call us.`,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    to: string,
    amount: number,
    paymentRef: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `BaoMbao Craft: Payment of UGX ${amount.toLocaleString()} received. Ref: ${paymentRef}. Thank you!`,
    });
  }

  /**
   * Send milestone completion
   */
  async sendMilestoneComplete(
    to: string,
    customerName: string,
    milestoneName: string,
    projectTitle: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, milestone "${milestoneName}" is complete for your "${projectTitle}" project! Log in to see photos.`,
    });
  }

  /**
   * Send project completion
   */
  async sendProjectComplete(
    to: string,
    customerName: string,
    projectTitle: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Congratulations ${customerName}! Your "${projectTitle}" is complete and ready for delivery. We'll be in touch to arrange. Thank you for choosing BaoMbao Craft!`,
    });
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(
    to: string,
    customerName: string,
    deliveryDate: string,
    projectTitle: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, your "${projectTitle}" is scheduled for delivery on ${deliveryDate}. Please ensure someone is available to receive it.`,
    });
  }

  /**
   * Send inquiry acknowledgment
   */
  async sendInquiryAcknowledgment(
    to: string,
    customerName: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, thanks for contacting BaoMbao Craft! We've received your inquiry and will respond within 24 hours.`,
    });
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    to: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<boolean> {
    return this.send({
      to,
      message: `Hi ${customerName}, reminder: You have a consultation with BaoMbao Craft on ${appointmentDate} at ${appointmentTime}. Reply YES to confirm.`,
    });
  }
}

export const smsService = new SmsService();
