import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TicketingStateGuard } from '../common/guards/ticketing-state.guard';
import { RequiredTicketingState } from '../common/decorators/required-ticketing-state.decorator';
import { TicketingState } from '../common/constants/ticketing-state.enum';
import { ReservationService } from './reservation.service';
import { ReserveTicketDto } from './dto';

@ApiTags('Ticketing - Reservation')
@Controller('ticketing/:eventId')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @ApiOperation({ summary: '티켓 종류/잔여 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('tickets')
  async getTickets(@Param('eventId') eventId: string) {
    return this.reservationService.getTickets(eventId);
  }

  @ApiOperation({ summary: '티켓 예약 (재고 차감)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TicketingStateGuard)
  @RequiredTicketingState(TicketingState.ACTIVE)
  @Post('reserve')
  async reserve(
    @Param('eventId') eventId: string,
    @Body() dto: ReserveTicketDto,
    @Request() req: any,
  ) {
    return this.reservationService.reserve(
      eventId,
      req.user.id,
      dto.ticketTypeId,
      dto.quantity,
    );
  }

  @ApiOperation({ summary: '예약 취소 (재고 복원)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TicketingStateGuard)
  @RequiredTicketingState(TicketingState.RESERVING)
  @Delete('reserve')
  async cancelReservation(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.reservationService.cancelReservation(eventId, req.user.id);
  }
}
