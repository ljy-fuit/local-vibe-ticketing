import { IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveTicketDto {
  @ApiProperty({ description: '티켓 종류 ID' })
  @IsString()
  ticketTypeId: string;

  @ApiProperty({ description: '수량', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}
