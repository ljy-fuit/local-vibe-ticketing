import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  // eventId comes from URL param, no body needed
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'PG 결제 키' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
