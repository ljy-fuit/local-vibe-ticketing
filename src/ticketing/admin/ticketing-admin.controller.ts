import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TicketingAdminService } from './ticketing-admin.service';
import {
  CreateTicketingEventDto,
  UpdateTicketingEventDto,
  AdjustStockDto,
} from './dto';

@ApiTags('Admin - Ticketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/ticketing/events')
export class TicketingAdminController {
  constructor(private readonly adminService: TicketingAdminService) {}

  @ApiOperation({ summary: '이벤트 생성' })
  @Post()
  async createEvent(@Body() dto: CreateTicketingEventDto) {
    return this.adminService.createEvent(dto);
  }

  @ApiOperation({ summary: '이벤트 설정 변경' })
  @Patch(':eventId')
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateTicketingEventDto,
  ) {
    return this.adminService.updateEvent(eventId, dto);
  }

  @ApiOperation({ summary: '대기열 오픈' })
  @Post(':eventId/open')
  async openEvent(@Param('eventId') eventId: string) {
    return this.adminService.openEvent(eventId);
  }

  @ApiOperation({ summary: '대기열 종료' })
  @Post(':eventId/close')
  async closeEvent(@Param('eventId') eventId: string) {
    return this.adminService.closeEvent(eventId);
  }

  @ApiOperation({ summary: '실시간 통계' })
  @Get(':eventId/stats')
  async getStats(@Param('eventId') eventId: string) {
    return this.adminService.getStats(eventId);
  }

  @ApiOperation({ summary: '재고 조정' })
  @Post(':eventId/stock')
  async adjustStock(
    @Param('eventId') eventId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.adminService.adjustStock(
      eventId,
      dto.ticketTypeId,
      dto.adjustment,
    );
  }
}
