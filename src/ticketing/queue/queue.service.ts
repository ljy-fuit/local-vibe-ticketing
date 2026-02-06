import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TicketingRedisService } from '../common/redis/ticketing-redis.service';
import { RedisKeys } from '../common/constants/redis-keys';
import { TicketingState } from '../common/constants/ticketing-state.enum';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly redisService: TicketingRedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  async enterQueue(
    eventId: string,
    userId: string,
  ): Promise<{ rank: number; state: TicketingState }> {
    // Check if event is open
    const isOpen = await this.client.sismember(RedisKeys.openEvents(), eventId);
    if (!isOpen) {
      throw new BadRequestException('현재 대기열이 열려있지 않습니다');
    }

    // Check current state
    const stateKey = RedisKeys.state(eventId, userId);
    const currentState = await this.client.get(stateKey);

    if (currentState === TicketingState.ACTIVE) {
      return { rank: 0, state: TicketingState.ACTIVE };
    }
    if (currentState === TicketingState.WAITING) {
      const rank = await this.client.zrank(RedisKeys.waiting(eventId), userId);
      return { rank: (rank ?? 0) + 1, state: TicketingState.WAITING };
    }
    if (
      currentState === TicketingState.RESERVING ||
      currentState === TicketingState.PAYING
    ) {
      return { rank: 0, state: currentState as TicketingState };
    }

    // Add to waiting queue (NX = only if not already present)
    const timestamp = Date.now();
    const waitingKey = RedisKeys.waiting(eventId);
    const added = await this.client.zadd(waitingKey, 'NX', timestamp, userId);

    if (added === 0) {
      // Already in queue
      const rank = await this.client.zrank(waitingKey, userId);
      return { rank: (rank ?? 0) + 1, state: TicketingState.WAITING };
    }

    // Set state with long TTL (will be updated by admission)
    await this.client.set(stateKey, TicketingState.WAITING, 'EX', 7200);

    const rank = await this.client.zrank(waitingKey, userId);
    return { rank: (rank ?? 0) + 1, state: TicketingState.WAITING };
  }

  async getStatus(
    eventId: string,
    userId: string,
  ): Promise<{
    state: string;
    rank: number | null;
    totalWaiting: number;
    activeCount: number;
    message: string;
  }> {
    const stateKey = RedisKeys.state(eventId, userId);
    const currentState = await this.client.get(stateKey);

    const totalWaiting = await this.client.zcard(RedisKeys.waiting(eventId));
    const activeCount = parseInt(
      (await this.client.get(RedisKeys.activeCount(eventId))) || '0',
      10,
    );

    if (
      !currentState ||
      currentState === (TicketingState.NOT_IN_QUEUE as string)
    ) {
      return {
        state: TicketingState.NOT_IN_QUEUE,
        rank: null,
        totalWaiting,
        activeCount,
        message: '대기열에 참여하지 않았습니다',
      };
    }

    if (currentState === TicketingState.WAITING) {
      const rank = await this.client.zrank(RedisKeys.waiting(eventId), userId);
      if (rank === null) {
        // Was in queue but got removed (race condition or expiry)
        await this.client.del(stateKey);
        return {
          state: TicketingState.NOT_IN_QUEUE,
          rank: null,
          totalWaiting,
          activeCount,
          message: '대기열에서 이탈되었습니다',
        };
      }
      return {
        state: TicketingState.WAITING,
        rank: rank + 1,
        totalWaiting,
        activeCount,
        message: `현재 대기 ${rank + 1}번 입니다`,
      };
    }

    if (currentState === TicketingState.ACTIVE) {
      return {
        state: TicketingState.ACTIVE,
        rank: 0,
        totalWaiting,
        activeCount,
        message: '입장 가능합니다',
      };
    }

    return {
      state: currentState,
      rank: null,
      totalWaiting,
      activeCount,
      message: `현재 상태: ${currentState}`,
    };
  }

  async leaveQueue(
    eventId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const stateKey = RedisKeys.state(eventId, userId);
    const currentState = await this.client.get(stateKey);

    if (currentState !== TicketingState.WAITING) {
      throw new BadRequestException('대기 상태에서만 이탈할 수 있습니다');
    }

    await this.client.zrem(RedisKeys.waiting(eventId), userId);
    await this.client.set(stateKey, TicketingState.LEFT, 'EX', 3600);

    return { success: true };
  }

  async getEventInfo(eventId: string): Promise<{
    isOpen: boolean;
    totalWaiting: number;
    activeCount: number;
    maxActive: number;
  }> {
    const isOpen = await this.client.sismember(RedisKeys.openEvents(), eventId);
    const totalWaiting = await this.client.zcard(RedisKeys.waiting(eventId));
    const activeCount = parseInt(
      (await this.client.get(RedisKeys.activeCount(eventId))) || '0',
      10,
    );
    const configRaw = await this.client.hgetall(RedisKeys.config(eventId));
    const maxActive = parseInt(configRaw?.maxActive || '3000', 10);

    return {
      isOpen: isOpen === 1,
      totalWaiting,
      activeCount,
      maxActive,
    };
  }
}
