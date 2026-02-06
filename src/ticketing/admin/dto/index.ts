import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketTypeDto {
  @ApiProperty({ description: '티켓 이름' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '티켓 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '가격' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ description: '총 재고' })
  @IsInt()
  @Min(1)
  totalStock: number;

  @ApiPropertyOptional({ description: '1인당 최대 구매 수량', default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;
}

export class CreateTicketingEventDto {
  @ApiProperty({ description: '이벤트 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '이벤트 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '이벤트 날짜' })
  @IsDateString()
  eventDate: Date;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({
    description: '최대 동시 활성 유저 수',
    default: 3000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActive?: number;

  @ApiPropertyOptional({
    description: '활성 상태 유지 시간 (초)',
    default: 600,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  activeTtlSeconds?: number;

  @ApiPropertyOptional({
    description: '예약 유지 시간 (초)',
    default: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  reservationTtlSeconds?: number;

  @ApiPropertyOptional({
    description: '결제 유지 시간 (초)',
    default: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  paymentTtlSeconds?: number;

  @ApiProperty({ description: '티켓 종류', type: [TicketTypeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes: TicketTypeDto[];
}

export class UpdateTicketingEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActive?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  activeTtlSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  reservationTtlSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  paymentTtlSeconds?: number;
}

export class AdjustStockDto {
  @ApiProperty({ description: '티켓 종류 ID' })
  @IsString()
  ticketTypeId: string;

  @ApiProperty({
    description: '조정량 (양수=추가, 음수=감소)',
  })
  @IsNumber()
  adjustment: number;
}
