import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import type { PgAdapter, PgConfirmResult } from './pg.interface';

@Injectable()
export class TossAdapter implements PgAdapter {
  private readonly logger = new Logger(TossAdapter.name);
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TOSS_SECRET_KEY', '');
  }

  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<PgConfirmResult> {
    try {
      const encodedKey = Buffer.from(`${this.secretKey}:`).toString('base64');

      const response = await fetch(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${encodedKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Toss payment confirm failed: ${data.message}`);
        return {
          success: false,
          message: data.message,
          rawResponse: data,
        };
      }

      return {
        success: true,
        paymentKey: data.paymentKey,
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Toss payment confirm failed: ${err.message}`);
      return {
        success: false,
        message: err.message,
      };
    }
  }

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
