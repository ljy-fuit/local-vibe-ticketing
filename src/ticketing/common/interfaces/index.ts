export interface TicketingEventConfig {
  maxActive: number;
  activeTtlSeconds: number;
  reservationTtlSeconds: number;
  paymentTtlSeconds: number;
  status: 'closed' | 'open' | 'paused';
}

export interface ActiveUserInfo {
  enteredAt: number;
  expiresAt: number;
}

export interface ReservationInfo {
  reservationId: string;
  ticketTypeId: string;
  quantity: number;
  createdAt: number;
  expiresAt: number;
}

export interface PaymentInfo {
  paymentId: string;
  reservationId: string;
  ticketTypeId: string;
  quantity: number;
  amount: number;
  pgOrderId: string;
  createdAt: number;
  expiresAt: number;
}
