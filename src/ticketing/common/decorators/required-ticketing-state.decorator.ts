import { SetMetadata } from '@nestjs/common';
import { TicketingState } from '../constants/ticketing-state.enum';

export const REQUIRED_TICKETING_STATE_KEY = 'requiredTicketingState';

export const RequiredTicketingState = (...states: TicketingState[]) =>
  SetMetadata(REQUIRED_TICKETING_STATE_KEY, states);
