import { Injectable, Logger } from '@nestjs/common';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';

@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);

  constructor(private readonly redisService: TicketingRedisService) {}

  async processAdmission(eventId: string): Promise<string[]> {
    const client = this.redisService.getClient();

    // Get event config
    const configRaw = await client.hgetall(RedisKeys.config(eventId));
    if (!configRaw || !configRaw.maxActive) {
      return [];
    }

    const maxActive = parseInt(configRaw.maxActive, 10);
    const activeTtlMs =
      parseInt(configRaw.activeTtlSeconds || '600', 10) * 1000;
    const now = Date.now();

    // Run admission Lua script atomically
    const result = await this.redisService.runScript(
      'admission',
      [
        RedisKeys.waiting(eventId),
        RedisKeys.active(eventId),
        RedisKeys.activeCount(eventId),
      ],
      [maxActive, now, activeTtlMs],
    );

    try {
      const promoted: string[] = JSON.parse(result);
      if (promoted.length > 0) {
        this.logger.log(`Event ${eventId}: promoted ${promoted.length} users`);
      }
      return promoted;
    } catch {
      return [];
    }
  }

  async cleanupExpired(eventId: string): Promise<void> {
    const now = Date.now();

    await this.redisService.runScript(
      'expire-active',
      [
        RedisKeys.active(eventId),
        RedisKeys.activeCount(eventId),
        RedisKeys.stock(eventId),
      ],
      [now, eventId],
    );
  }
}
