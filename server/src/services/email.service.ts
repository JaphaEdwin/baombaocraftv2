/**
 * Email Service
 * Integration with SendGrid for transactional emails
 */

import { logger } from '../utils/logger.js';

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export class EmailService {
  private config: EmailConfig;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor() {
    this.config = {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.EMAIL_FROM || 'hello@baombao.com',
      fromName: process.env.EMAIL_FROM_NAME || 'BaoMbao Craft',
    };
  }

  /**
   * Send transactional email
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text, templateId, dynamicData, attachments } = options;

    try {
      const payload: any = {
        personalizations: [
          {
            to: [{ email: to }],
            ...(dynamicData && { dynamic_template_data: dynamicData }),
          },
        ],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject,
      };

      if (templateId) {
        payload.template_id = templateId;
      } else {
        payload.content = [];
        if (text) {
          payload.content.push({ type: 'text/plain', value: text });
        }
        if (html) {
          payload.content.push({ type: 'text/html', value: html });
        }
      }

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        logger.info(`Email sent to ${to}: ${subject}`);
        return true;
      }

      const error = await response.text();
      logger.error(`SendGrid error: ${error}`);
      return false;

    } catch (error) {
      logger.error('Email send error:', error);
      return false;
    }
  }

  // ==================== TEMPLATE METHODS ====================

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, name: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Welcome to BaoMbao Craft!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Welcome to BaoMbao Craft, ${name}!</h1>
          <p>Thank you for creating an account with us. We're excited to help you create beautiful, custom-made furniture for your home or business.</p>
          <p>With your account, you can:</p>
          <ul>
            <li>Track your project progress in real-time</li>
            <li>View and manage quotations</li>
            <li>Make secure payments</li>
            <li>See photos as your furniture is crafted</li>
          </ul>
          <p>Have questions? Reply to this email or call us at +256 XXX XXX XXX.</p>
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The BaoMbao Craft Team</strong>
          </p>
        </div>
      `,
    });
  }

  /**
   * Send verification email
   */
  async sendVerification(to: string, name: string, token: string): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    return this.send({
      to,
      subject: 'Verify Your Email - BaoMbao Craft',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Verify Your Email</h1>
          <p>Hi ${name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Verify Email</a>
          </p>
          <p>Or copy this link: ${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    return this.send({
      to,
      subject: 'Reset Your Password - BaoMbao Craft',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Reset Your Password</h1>
          <p>Hi ${name},</p>
          <p>You requested to reset your password. Click the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Send quotation email with PDF
   */
  async sendQuotation(
    to: string,
    customerName: string,
    quotationNumber: string,
    total: number,
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    const attachments = pdfBuffer ? [
      {
        content: pdfBuffer.toString('base64'),
        filename: `BaoMbao-Quote-${quotationNumber}.pdf`,
        type: 'application/pdf',
      },
    ] : undefined;

    return this.send({
      to,
      subject: `Your Quotation ${quotationNumber} from BaoMbao Craft`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Your Quotation is Ready!</h1>
          <p>Dear ${customerName},</p>
          <p>Thank you for your interest in BaoMbao Craft. We've prepared a quotation based on your requirements.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Quotation Number:</strong> ${quotationNumber}</p>
            <p><strong>Total:</strong> UGX ${total.toLocaleString()}</p>
          </div>
          <p>Please find the detailed quotation attached as a PDF.</p>
          <p>To accept this quotation, log in to your account or reply to this email.</p>
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The BaoMbao Craft Team</strong>
          </p>
        </div>
      `,
      attachments,
    });
  }

  /**
   * Send project update email
   */
  async sendProjectUpdate(
    to: string,
    customerName: string,
    projectTitle: string,
    update: string,
    photoUrls?: string[]
  ): Promise<boolean> {
    const photoHtml = photoUrls?.map(url => 
      `<img src="${url}" style="max-width: 100%; margin: 10px 0; border-radius: 5px;">`
    ).join('') || '';

    return this.send({
      to,
      subject: `Project Update: ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Project Update</h1>
          <p>Dear ${customerName},</p>
          <p>We have an update on your project "<strong>${projectTitle}</strong>":</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p>${update}</p>
          </div>
          ${photoHtml ? `<h3>Progress Photos</h3>${photoHtml}` : ''}
          <p>Log in to your account to see more details.</p>
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The BaoMbao Craft Team</strong>
          </p>
        </div>
      `,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    to: string,
    customerName: string,
    amount: number,
    paymentRef: string,
    projectTitle?: string
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Payment Received - ${paymentRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Payment Received ✓</h1>
          <p>Dear ${customerName},</p>
          <p>We've received your payment. Thank you!</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Amount:</strong> UGX ${amount.toLocaleString()}</p>
            <p><strong>Reference:</strong> ${paymentRef}</p>
            ${projectTitle ? `<p><strong>Project:</strong> ${projectTitle}</p>` : ''}
          </div>
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The BaoMbao Craft Team</strong>
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
