import { Global, Module } from '@nestjs/common';
import { TicketingRedisService } from './ticketing-redis.service';

@Global()
@Module({
  providers: [TicketingRedisService],
  exports: [TicketingRedisService],
})
export class TicketingRedisModule {}
