import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketingReservation } from '../persistence/entities/reservation.entity';
import { TicketingPayment } from '../persistence/entities/payment.entity';
import { TicketType } from '../persistence/entities/ticket-type.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    @InjectRepository(TicketingReservation)
    private readonly reservationRepo: Repository<TicketingReservation>,
    @InjectRepository(TicketingPayment)
    private readonly paymentRepo: Repository<TicketingPayment>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredReservations() {
    const now = new Date();

    // Find expired pending reservations in DB
    const expired = await this.reservationRepo.find({
      where: {
        status: 'pending',
        expiresAt: LessThan(now),
      },
    });

    if (expired.length === 0) return;

    const client = this.redisService.getClient();

    for (const rsv of expired) {
      try {
        // Restore stock in Redis
        const currentStock = parseInt(
          (await client.hget(RedisKeys.stock(rsv.eventId), rsv.ticketTypeId)) ||
            '0',
          10,
        );
        await client.hset(
          RedisKeys.stock(rsv.eventId),
          rsv.ticketTypeId,
          String(currentStock + rsv.quantity),
        );

        // Mark as expired in DB
        await this.reservationRepo.update(rsv.id, { status: 'expired' });

        this.logger.debug(
          `Expired reservation ${rsv.reservationId} cleaned up, stock restored`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to cleanup reservation ${rsv.reservationId}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Cleaned up ${expired.length} expired reservations`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredPayments() {
    const now = new Date();

    // Find expired pending payments in DB
    const expired = await this.paymentRepo.find({
      where: {
        status: 'pending',
        expiresAt: LessThan(now),
      },
    });

    for (const pay of expired) {
      try {
        await this.paymentRepo.update(pay.id, { status: 'cancelled' });

        this.logger.debug(`Expired payment ${pay.paymentId} cleaned up`);
      } catch (err) {
        this.logger.error(
          `Failed to cleanup payment ${pay.paymentId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
