import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { PersistenceService } from './persistence.service';

@Injectable()
export class PersistenceScheduler {
  private readonly logger = new Logger(PersistenceScheduler.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    private readonly persistenceService: PersistenceService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncStock() {
    const client = this.redisService.getClient();
    const openEvents = await client.smembers(RedisKeys.openEvents());

    for (const eventId of openEvents) {
      try {
        await this.persistenceService.syncStockToDb(eventId);
      } catch (err) {
        this.logger.error(
          `Stock sync failed for event ${eventId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
