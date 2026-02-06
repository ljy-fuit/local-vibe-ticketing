export interface PgConfirmResult {
  success: boolean;
  paymentKey?: string;
  message?: string;
  rawResponse?: Record<string, any>;
}

export interface PgAdapter {
  confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<PgConfirmResult>;

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean;
}

export const PG_ADAPTER = 'PG_ADAPTER';
