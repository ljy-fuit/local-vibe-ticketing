import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketingEvent } from '../persistence/entities/ticketing-event.entity';
import { TicketType } from '../persistence/entities/ticket-type.entity';

@Injectable()
export class TicketingAdminService {
  private readonly logger = new Logger(TicketingAdminService.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    @InjectRepository(TicketingEvent)
    private readonly eventRepo: Repository<TicketingEvent>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  async createEvent(data: {
    title: string;
    description?: string;
    eventDate: Date;
    venue?: string;
    maxActive?: number;
    activeTtlSeconds?: number;
    reservationTtlSeconds?: number;
    paymentTtlSeconds?: number;
    ticketTypes: {
      name: string;
      description?: string;
      price: number;
      totalStock: number;
      maxPerUser?: number;
    }[];
  }) {
    const event = await this.eventRepo.save({
      title: data.title,
      description: data.description || null,
      eventDate: data.eventDate,
      venue: data.venue || null,
      maxActive: data.maxActive ?? 3000,
      activeTtlSeconds: data.activeTtlSeconds ?? 600,
      reservationTtlSeconds: data.reservationTtlSeconds ?? 300,
      paymentTtlSeconds: data.paymentTtlSeconds ?? 300,
      status: 'closed' as const,
    });

    const ticketTypes = await Promise.all(
      data.ticketTypes.map((tt) =>
        this.ticketTypeRepo.save({
          eventId: event.id,
          name: tt.name,
          description: tt.description || null,
          price: tt.price,
          totalStock: tt.totalStock,
          remainingStock: tt.totalStock,
          maxPerUser: tt.maxPerUser ?? 4,
        }),
      ),
    );

    return { event, ticketTypes };
  }

  async updateEvent(
    eventId: string,
    data: {
      title?: string;
      description?: string;
      eventDate?: Date;
      venue?: string;
      maxActive?: number;
      activeTtlSeconds?: number;
      reservationTtlSeconds?: number;
      paymentTtlSeconds?: number;
    },
  ) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다');
    }

    if (event.status === 'open') {
      throw new BadRequestException(
        '열린 이벤트는 수정할 수 없습니다. 먼저 종료해주세요.',
      );
    }

    await this.eventRepo.update(eventId, data);
    return this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['ticketTypes'],
    });
  }

  async openEvent(eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['ticketTypes'],
    });
    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다');
    }

    const client = this.redisService.getClient();

    // Set config in Redis
    await client.hset(RedisKeys.config(eventId), {
      maxActive: String(event.maxActive),
      activeTtlSeconds: String(event.activeTtlSeconds),
      reservationTtlSeconds: String(event.reservationTtlSeconds),
      paymentTtlSeconds: String(event.paymentTtlSeconds),
      status: 'open',
    });

    // Initialize stock in Redis
    for (const tt of event.ticketTypes) {
      await client.hset(
        RedisKeys.stock(eventId),
        tt.id,
        String(tt.remainingStock),
      );
    }

    // Initialize active count
    await client.set(RedisKeys.activeCount(eventId), '0');

    // Add to open events set
    await client.sadd(RedisKeys.openEvents(), eventId);

    // Update DB
    await this.eventRepo.update(eventId, {
      status: 'open',
      openedAt: new Date(),
    });

    this.logger.log(`Event ${eventId} opened`);
    return { status: 'open', eventId };
  }

  async closeEvent(eventId: string) {
    const client = this.redisService.getClient();

    // Remove from open events
    await client.srem(RedisKeys.openEvents(), eventId);

    // Update config status
    await client.hset(RedisKeys.config(eventId), 'status', 'closed');

    // Update DB
    await this.eventRepo.update(eventId, {
      status: 'closed',
      closedAt: new Date(),
    });

    this.logger.log(`Event ${eventId} closed`);
    return { status: 'closed', eventId };
  }

  async getStats(eventId: string) {
    const client = this.redisService.getClient();

    const totalWaiting = await client.zcard(RedisKeys.waiting(eventId));
    const activeCount = parseInt(
      (await client.get(RedisKeys.activeCount(eventId))) || '0',
      10,
    );
    const configRaw = await client.hgetall(RedisKeys.config(eventId));
    const stockData = await client.hgetall(RedisKeys.stock(eventId));

    return {
      eventId,
      status: configRaw?.status || 'unknown',
      totalWaiting,
      activeCount,
      maxActive: parseInt(configRaw?.maxActive || '0', 10),
      stock: Object.entries(stockData).map(([typeId, remaining]) => ({
        ticketTypeId: typeId,
        remaining: parseInt(remaining, 10),
      })),
    };
  }

  async adjustStock(eventId: string, ticketTypeId: string, adjustment: number) {
    const client = this.redisService.getClient();
    const stockKey = RedisKeys.stock(eventId);

    const current = parseInt(
      (await client.hget(stockKey, ticketTypeId)) || '0',
      10,
    );
    const newStock = current + adjustment;

    if (newStock < 0) {
      throw new BadRequestException('재고는 음수가 될 수 없습니다');
    }

    await client.hset(stockKey, ticketTypeId, String(newStock));

    // Sync to DB
    await this.ticketTypeRepo.update(ticketTypeId, {
      remainingStock: newStock,
    });

    return { ticketTypeId, previousStock: current, newStock };
  }
}
