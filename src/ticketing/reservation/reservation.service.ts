import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketingReservation } from '../persistence/entities/reservation.entity';
import { TicketType } from '../persistence/entities/ticket-type.entity';
import type { ReservationInfo } from '../common/interfaces';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    @InjectRepository(TicketingReservation)
    private readonly reservationRepo: Repository<TicketingReservation>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  async getTickets(eventId: string) {
    const client = this.redisService.getClient();
    const stockData = await client.hgetall(RedisKeys.stock(eventId));

    const ticketTypes = await this.ticketTypeRepo.find({
      where: { eventId },
    });

    return ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: tt.price,
      maxPerUser: tt.maxPerUser,
      remainingStock: parseInt(stockData[tt.id] || '0', 10),
    }));
  }

  async reserve(
    eventId: string,
    userId: string,
    ticketTypeId: string,
    quantity: number,
  ) {
    const client = this.redisService.getClient();

    // Get reservation TTL from config
    const configRaw = await client.hgetall(RedisKeys.config(eventId));
    const rsvTtl = parseInt(configRaw?.reservationTtlSeconds || '300', 10);

    const reservationId = uuidv4();
    const now = Date.now();
    const reservationInfo: ReservationInfo = {
      reservationId,
      ticketTypeId,
      quantity,
      createdAt: now,
      expiresAt: now + rsvTtl * 1000,
    };

    // Run atomic reserve-stock Lua script
    const result = await this.redisService.runScript(
      'reserve-stock',
      [
        RedisKeys.state(eventId, userId),
        RedisKeys.stock(eventId),
        RedisKeys.reservation(eventId, userId),
      ],
      [ticketTypeId, quantity, JSON.stringify(reservationInfo), rsvTtl],
    );

    const parsed = JSON.parse(result);
    if (!parsed.ok) {
      if (parsed.reason === 'NOT_ACTIVE') {
        throw new BadRequestException(
          '활성 상태가 아닙니다. 대기열에 다시 참여해주세요.',
        );
      }
      if (parsed.reason === 'ALREADY_RESERVED') {
        throw new BadRequestException('이미 예약이 진행 중입니다.');
      }
      if (parsed.reason === 'OUT_OF_STOCK') {
        throw new BadRequestException('해당 티켓이 매진되었습니다.');
      }
      throw new BadRequestException(parsed.reason);
    }

    // Persist to DB asynchronously
    const expiresAt = new Date(now + rsvTtl * 1000);
    this.reservationRepo
      .save({
        reservationId,
        eventId,
        userId,
        ticketTypeId,
        quantity,
        status: 'pending' as const,
        expiresAt,
      })
      .catch((err) =>
        this.logger.error(`Failed to persist reservation: ${err.message}`),
      );

    return {
      reservationId,
      ticketTypeId,
      quantity,
      remainingStock: parsed.remaining,
      expiresIn: rsvTtl,
    };
  }

  async cancelReservation(eventId: string, userId: string) {
    const client = this.redisService.getClient();

    // Get active TTL from config to restore ACTIVE state
    const configRaw = await client.hgetall(RedisKeys.config(eventId));
    const activeTtlMs =
      parseInt(configRaw?.activeTtlSeconds || '600', 10) * 1000;

    const result = await this.redisService.runScript(
      'cancel-reservation',
      [
        RedisKeys.reservation(eventId, userId),
        RedisKeys.stock(eventId),
        RedisKeys.state(eventId, userId),
        RedisKeys.active(eventId),
      ],
      [userId, activeTtlMs, Date.now()],
    );

    const parsed = JSON.parse(result);
    if (!parsed.ok) {
      throw new BadRequestException('예약 내역이 없습니다.');
    }

    // Update DB
    this.reservationRepo
      .update({ eventId, userId, status: 'pending' }, { status: 'cancelled' })
      .catch((err) =>
        this.logger.error(`Failed to update reservation in DB: ${err.message}`),
      );

    return {
      ticketTypeId: parsed.ticketTypeId,
      quantity: parsed.quantity,
      remainingStock: parsed.remaining,
    };
  }
}
