import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketingState } from '../common/constants/ticketing-state.enum';
import { TicketingPayment } from '../persistence/entities/payment.entity';
import { TicketingReservation } from '../persistence/entities/reservation.entity';
import { TicketType } from '../persistence/entities/ticket-type.entity';
import { PG_ADAPTER } from './pg/pg.interface';
import type { PgAdapter } from './pg/pg.interface';
import type { PaymentInfo, ReservationInfo } from '../common/interfaces';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    @InjectRepository(TicketingPayment)
    private readonly paymentRepo: Repository<TicketingPayment>,
    @InjectRepository(TicketingReservation)
    private readonly reservationRepo: Repository<TicketingReservation>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    @Inject(PG_ADAPTER)
    private readonly pgAdapter: PgAdapter,
  ) {}

  async initiatePayment(
    eventId: string,
    userId: string,
  ): Promise<{
    paymentId: string;
    pgOrderId: string;
    amount: number;
    expiresIn: number;
  }> {
    const client = this.redisService.getClient();

    // Verify user is in RESERVING state
    const stateKey = RedisKeys.state(eventId, userId);
    const currentState = await client.get(stateKey);
    if (currentState !== TicketingState.RESERVING) {
      throw new BadRequestException(
        '예약 상태에서만 결제를 시작할 수 있습니다.',
      );
    }

    // Get reservation info
    const rsvKey = RedisKeys.reservation(eventId, userId);
    const rsvJson = await client.get(rsvKey);
    if (!rsvJson) {
      throw new BadRequestException('예약 정보가 만료되었습니다.');
    }

    const rsv: ReservationInfo = JSON.parse(rsvJson);

    // Check for existing payment
    const payKey = RedisKeys.payment(eventId, userId);
    const existingPay = await client.get(payKey);
    if (existingPay) {
      const existing: PaymentInfo = JSON.parse(existingPay);
      return {
        paymentId: existing.paymentId,
        pgOrderId: existing.pgOrderId,
        amount: existing.amount,
        expiresIn: Math.max(
          0,
          Math.floor((existing.expiresAt - Date.now()) / 1000),
        ),
      };
    }

    // Get config for payment TTL
    const configRaw = await client.hgetall(RedisKeys.config(eventId));
    const paymentTtl = parseInt(configRaw?.paymentTtlSeconds || '300', 10);

    // Get ticket price from DB
    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: rsv.ticketTypeId },
    });
    const price = ticketType?.price ?? 0;
    const amount = price * rsv.quantity;

    const paymentId = uuidv4();
    const pgOrderId = `TKT-${eventId}-${userId}-${Date.now()}`;
    const now = Date.now();

    const paymentInfo: PaymentInfo = {
      paymentId,
      reservationId: rsv.reservationId,
      ticketTypeId: rsv.ticketTypeId,
      quantity: rsv.quantity,
      amount,
      pgOrderId,
      createdAt: now,
      expiresAt: now + paymentTtl * 1000,
    };

    // Store payment info in Redis with TTL
    await client.set(payKey, JSON.stringify(paymentInfo), 'EX', paymentTtl);

    // Update state to PAYING
    await client.set(stateKey, TicketingState.PAYING, 'EX', paymentTtl);

    // Persist to DB
    this.paymentRepo
      .save({
        paymentId,
        eventId,
        userId,
        reservationId: rsv.reservationId,
        pgOrderId,
        amount,
        status: 'pending' as const,
        expiresAt: new Date(now + paymentTtl * 1000),
      })
      .catch((err) =>
        this.logger.error(`Failed to persist payment: ${err.message}`),
      );

    return {
      paymentId,
      pgOrderId,
      amount,
      expiresIn: paymentTtl,
    };
  }

  async handleWebhook(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<{ success: boolean }> {
    // Confirm payment with PG
    const confirmResult = await this.pgAdapter.confirmPayment(
      paymentKey,
      orderId,
      amount,
    );

    if (!confirmResult.success) {
      this.logger.error(
        `Payment confirmation failed: ${confirmResult.message}`,
      );

      // Find payment by orderId and mark as failed
      await this.paymentRepo.update(
        { pgOrderId: orderId },
        { status: 'failed', pgResponse: confirmResult.rawResponse || null },
      );

      return { success: false };
    }

    // Find the payment record
    const payment = await this.paymentRepo.findOne({
      where: { pgOrderId: orderId },
    });

    if (!payment) {
      this.logger.error(`Payment not found for orderId: ${orderId}`);
      return { success: false };
    }

    // Update payment
    await this.paymentRepo.update(
      { id: payment.id },
      {
        status: 'confirmed',
        pgPaymentKey: paymentKey,
        pgResponse: confirmResult.rawResponse || null,
      },
    );

    // Update reservation to paid
    await this.reservationRepo.update(
      { reservationId: payment.reservationId },
      { status: 'paid' },
    );

    // Update Redis state to COMPLETED
    const client = this.redisService.getClient();
    const stateKey = RedisKeys.state(payment.eventId, payment.userId);
    await client.set(stateKey, TicketingState.COMPLETED, 'EX', 86400);

    // Clean up Redis keys
    await client.del(RedisKeys.payment(payment.eventId, payment.userId));
    await client.del(RedisKeys.reservation(payment.eventId, payment.userId));

    // Remove from active set
    await client.hdel(RedisKeys.active(payment.eventId), payment.userId);
    const newCount = await client.hlen(RedisKeys.active(payment.eventId));
    await client.set(RedisKeys.activeCount(payment.eventId), String(newCount));

    return { success: true };
  }

  async getPaymentStatus(eventId: string, userId: string) {
    const client = this.redisService.getClient();
    const payKey = RedisKeys.payment(eventId, userId);
    const payJson = await client.get(payKey);

    if (payJson) {
      const pay: PaymentInfo = JSON.parse(payJson);
      return {
        paymentId: pay.paymentId,
        pgOrderId: pay.pgOrderId,
        amount: pay.amount,
        status: 'pending',
        expiresIn: Math.max(0, Math.floor((pay.expiresAt - Date.now()) / 1000)),
      };
    }

    // Check DB for completed/failed payments
    const dbPayment = await this.paymentRepo.findOne({
      where: { eventId, userId },
      order: { createdAt: 'DESC' },
    });

    if (dbPayment) {
      return {
        paymentId: dbPayment.paymentId,
        pgOrderId: dbPayment.pgOrderId,
        amount: dbPayment.amount,
        status: dbPayment.status,
        expiresIn: 0,
      };
    }

    throw new BadRequestException('결제 정보가 없습니다.');
  }
}
