import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketType } from './entities/ticket-type.entity';

@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  async syncStockToDb(eventId: string) {
    const client = this.redisService.getClient();
    const stockData = await client.hgetall(RedisKeys.stock(eventId));

    for (const [typeId, remaining] of Object.entries(stockData)) {
      await this.ticketTypeRepo.update(typeId, {
        remainingStock: parseInt(remaining, 10),
      });
    }

    this.logger.debug(`Stock synced to DB for event ${eventId}`);
  }
}
