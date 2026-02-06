import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TicketingRedisService } from '../redis/ticketing-redis.service';
import { RedisKeys } from '../constants/redis-keys';
import { TicketingState } from '../constants/ticketing-state.enum';
import { REQUIRED_TICKETING_STATE_KEY } from '../decorators/required-ticketing-state.decorator';

@Injectable()
export class TicketingStateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: TicketingRedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredStates = this.reflector.getAllAndOverride<TicketingState[]>(
      REQUIRED_TICKETING_STATE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredStates || requiredStates.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const eventId = request.params.eventId;

    if (!user?.id) {
      throw new ForbiddenException('인증이 필요합니다');
    }

    if (!eventId) {
      throw new ForbiddenException('이벤트 ID가 필요합니다');
    }

    const client = this.redisService.getClient();
    const stateKey = RedisKeys.state(eventId, user.id);
    const currentState = await client.get(stateKey);

    if (
      !currentState ||
      !requiredStates.includes(currentState as TicketingState)
    ) {
      throw new ForbiddenException(
        `현재 상태(${currentState || 'NONE'})에서는 접근할 수 없습니다. 필요한 상태: ${requiredStates.join(', ')}`,
      );
    }

    request.ticketingState = currentState;
    return true;
  }
}
