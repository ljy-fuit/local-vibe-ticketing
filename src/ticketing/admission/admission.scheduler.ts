import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { AdmissionService } from './admission.service';

@Injectable()
export class AdmissionScheduler {
  private readonly logger = new Logger(AdmissionScheduler.name);

  constructor(
    private readonly redisService: TicketingRedisService,
    private readonly admissionService: AdmissionService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleAdmission() {
    const client = this.redisService.getClient();

    // Get all open events
    const openEvents = await client.smembers(RedisKeys.openEvents());
    if (openEvents.length === 0) return;

    for (const eventId of openEvents) {
      const lockKey = RedisKeys.admissionLock(eventId);

      // Distributed lock: only one replica processes admission
      const acquired = await this.redisService.acquireLock(lockKey, 5);
      if (!acquired) continue;

      try {
        // Process admission for this event
        const promoted = await this.admissionService.processAdmission(eventId);

        // Log promoted users (push notification can be added later)
        if (promoted.length > 0) {
          this.logger.log(
            `Event ${eventId}: ${promoted.length} users promoted`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Admission error for event ${eventId}: ${(err as Error).message}`,
        );
      }
      // Lock auto-expires after 5 seconds, no need to release
    }
  }
}
