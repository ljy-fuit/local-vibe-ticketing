import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TicketingStateGuard } from '../common/guards/ticketing-state.guard';
import { RequiredTicketingState } from '../common/decorators/required-ticketing-state.decorator';
import { TicketingState } from '../common/constants/ticketing-state.enum';
import { PaymentService } from './payment.service';

@ApiTags('Ticketing - Payment')
@Controller('ticketing/:eventId/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'PG 결제 요청' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TicketingStateGuard)
  @RequiredTicketingState(TicketingState.RESERVING)
  @Post('initiate')
  async initiatePayment(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.paymentService.initiatePayment(eventId, req.user.id);
  }

  @ApiOperation({ summary: '결제 상태 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getPaymentStatus(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.paymentService.getPaymentStatus(eventId, req.user.id);
  }
}
