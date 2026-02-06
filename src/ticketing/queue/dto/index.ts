import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnterQueueDto {
  @ApiProperty({ description: '이벤트 ID' })
  @IsString()
  eventId: string;
}

export class QueueStatusResponseDto {
  @ApiProperty()
  state: string;

  @ApiProperty({ nullable: true })
  rank: number | null;

  @ApiProperty()
  totalWaiting: number;

  @ApiProperty()
  activeCount: number;

  @ApiProperty()
  message: string;
}

export class QueueInfoResponseDto {
  @ApiProperty()
  isOpen: boolean;

  @ApiProperty()
  totalWaiting: number;

  @ApiProperty()
  activeCount: number;

  @ApiProperty()
  maxActive: number;
}
