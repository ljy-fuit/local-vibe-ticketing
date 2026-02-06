import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaymentWebhookDto } from './dto';

@ApiTags('Ticketing - Payment Webhook')
@Controller('ticketing/payment')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'PG 웹훅 (서명 검증)' })
  @Post('webhook')
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentService.handleWebhook(
      dto.paymentKey,
      dto.orderId,
      dto.amount,
    );
  }
}
