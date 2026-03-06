/**
 * Airtel Money Service
 * Integration with Airtel Money API for Uganda
 */

import { logger } from '../../utils/logger.js';

interface AirtelConfig {
  clientId: string;
  clientSecret: string;
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

export class AirtelMoneyService {
  private config: AirtelConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      clientId: process.env.AIRTEL_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
      environment: (process.env.AIRTEL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: process.env.AIRTEL_CALLBACK_URL || '',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://openapi.airtel.africa'
      : 'https://sandbox.airtel.africa';
  }

  /**
   * Get OAuth2 access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in: number };
      
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('Airtel Money auth error:', error);
      throw new Error('Failed to authenticate with Airtel Money API');
    }
  }

  /**
   * Format phone number for Airtel API
   */
  private formatPhone(phone: string): string {
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
   * Initiate collection request
   */
  async collectPayment(data: PaymentRequest): Promise<PaymentResponse> {
    const token = await this.getAccessToken();

    const requestBody = {
      reference: data.paymentRef,
      subscriber: {
        country: 'UG',
        currency: 'UGX',
        msisdn: this.formatPhone(data.phone),
      },
      transaction: {
        amount: data.amount,
        country: 'UG',
        currency: 'UGX',
        id: data.paymentRef,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/merchant/v1/payments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json() as any;

      if (result.status?.success) {
        logger.info(`Airtel Money payment initiated: ${data.paymentRef}`);
        
        return {
          transactionId: result.data?.transaction?.id || data.paymentRef,
          status: 'pending',
          instruction: 'You will receive a prompt on your phone. Enter your Airtel Money PIN to complete the payment.',
        };
      }

      throw new Error(result.status?.message || 'Payment request failed');

    } catch (error: any) {
      logger.error('Airtel Money payment error:', error);
      throw new Error(error.message || 'Airtel Money payment failed');
    }
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: 'pending' | 'successful' | 'failed';
    reason?: string;
  }> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': 'UGX',
          },
        }
      );

      const data = await response.json() as any;

      const statusMap: Record<string, 'pending' | 'successful' | 'failed'> = {
        TS: 'successful',   // Transaction Success
        TF: 'failed',        // Transaction Failed
        TP: 'pending',       // Transaction Pending
        TIP: 'pending',      // Transaction In Progress
      };

      return {
        status: statusMap[data.data?.transaction?.status] || 'pending',
        reason: data.data?.transaction?.message,
      };

    } catch (error) {
      logger.error('Airtel Money status check error:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Refund a transaction
   */
  async refund(transactionId: string): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/standard/v1/payments/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: {
            airtel_money_id: transactionId,
          },
        }),
      });

      const data = await response.json() as any;
      return data.status?.success || false;

    } catch (error) {
      logger.error('Airtel Money refund error:', error);
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ available: number; currency: string }> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/standard/v1/users/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      });

      const data = await response.json() as any;
      
      return {
        available: parseFloat(data.data?.balance) || 0,
        currency: data.data?.currency || 'UGX',
      };

    } catch (error) {
      logger.error('Airtel Money balance check error:', error);
      throw new Error('Failed to check balance');
    }
  }

  /**
   * Validate user phone number
   */
  async validateUser(phone: string): Promise<{ valid: boolean; name?: string }> {
    const token = await this.getAccessToken();
    const msisdn = this.formatPhone(phone);

    try {
      const response = await fetch(`${this.baseUrl}/standard/v1/users/${msisdn}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      });

      const data = await response.json() as any;

      if (data.status?.success) {
        return {
          valid: true,
          name: `${data.data?.first_name} ${data.data?.last_name}`.trim(),
        };
      }

      return { valid: false };

    } catch (error) {
      logger.error('Airtel Money user validation error:', error);
      return { valid: false };
    }
  }
}
