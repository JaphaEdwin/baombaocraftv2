/**
 * MTN Mobile Money Service
 * Integration with MTN MoMo API for Uganda
 * 
 * API Documentation: https://momodeveloper.mtn.com/
 */

import { logger } from '../../utils/logger.js';

interface MtnMomoConfig {
  apiKey: string;
  apiUser: string;
  primaryKey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

interface PaymentRequest {
  paymentRef: string;
  amount: number;
  phone: string;
  reason: string;
}

interface PaymentResponse {
  transactionId: string;
  status: string;
  instruction: string;
}

export class MtnMomoService {
  private config: MtnMomoConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      apiUser: process.env.MTN_MOMO_API_USER || '',
      primaryKey: process.env.MTN_MOMO_PRIMARY_KEY || '',
      environment: (process.env.MTN_MOMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://proxy.momoapi.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';
  }

  /**
   * Get access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.config.apiUser}:${this.config.apiKey}`
      ).toString('base64');

      const response = await fetch(`${this.baseUrl}/collection/token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': this.config.primaryKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in: number };
      
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('MTN MoMo token error:', error);
      throw new Error('Failed to authenticate with MTN MoMo API');
    }
  }

  /**
   * Format phone number for MTN API (MSISDN format)
   */
  private formatPhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Uganda format: 256XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '256' + cleaned.substring(1);
    } else if (!cleaned.startsWith('256')) {
      cleaned = '256' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Request to Pay - initiates payment collection
   */
  async requestToPay(data: PaymentRequest): Promise<PaymentResponse> {
    const token = await this.getAccessToken();
    const referenceId = data.paymentRef;

    const requestBody = {
      amount: data.amount.toString(),
      currency: 'UGX',
      externalId: data.paymentRef,
      payer: {
        partyIdType: 'MSISDN',
        partyId: this.formatPhone(data.phone),
      },
      payerMessage: data.reason,
      payeeNote: `BaoMbao Craft - ${data.paymentRef}`,
    };

    try {
      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.config.environment,
          'X-Callback-Url': this.config.callbackUrl,
          'Ocp-Apim-Subscription-Key': this.config.primaryKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 202) {
        logger.info(`MTN MoMo payment initiated: ${referenceId}`);
        
        return {
          transactionId: referenceId,
          status: 'pending',
          instruction: 'You will receive a prompt on your phone. Enter your MTN Mobile Money PIN to complete the payment.',
        };
      }

      const errorData = await response.text();
      throw new Error(`Payment request failed: ${errorData}`);

    } catch (error: any) {
      logger.error('MTN MoMo payment error:', error);
      throw new Error(error.message || 'MTN Mobile Money payment failed');
    }
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(referenceId: string): Promise<{
    status: 'pending' | 'successful' | 'failed';
    reason?: string;
    financialTransactionId?: string;
  }> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.environment,
            'Ocp-Apim-Subscription-Key': this.config.primaryKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json() as any;

      const statusMap: Record<string, 'pending' | 'successful' | 'failed'> = {
        PENDING: 'pending',
        SUCCESSFUL: 'successful',
        FAILED: 'failed',
      };

      return {
        status: statusMap[data.status] || 'pending',
        reason: data.reason,
        financialTransactionId: data.financialTransactionId,
      };

    } catch (error) {
      logger.error('MTN MoMo status check error:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ available: number; currency: string }> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/collection/v1_0/account/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': this.config.environment,
          'Ocp-Apim-Subscription-Key': this.config.primaryKey,
        },
      });

      const data = await response.json() as any;
      
      return {
        available: parseFloat(data.availableBalance),
        currency: data.currency,
      };

    } catch (error) {
      logger.error('MTN MoMo balance check error:', error);
      throw new Error('Failed to check balance');
    }
  }

  /**
   * Validate account holder
   */
  async validateAccountHolder(phone: string): Promise<boolean> {
    const token = await this.getAccessToken();
    const msisdn = this.formatPhone(phone);

    try {
      const response = await fetch(
        `${this.baseUrl}/collection/v1_0/accountholder/msisdn/${msisdn}/active`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.environment,
            'Ocp-Apim-Subscription-Key': this.config.primaryKey,
          },
        }
      );

      return response.ok;

    } catch (error) {
      logger.error('MTN MoMo account validation error:', error);
      return false;
    }
  }
}
