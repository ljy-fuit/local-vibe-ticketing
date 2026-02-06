import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QueueService } from './queue.service';

@ApiTags('Ticketing - Queue')
@Controller('ticketing/:eventId/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @ApiOperation({ summary: '대기열 진입' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enter')
  async enterQueue(@Param('eventId') eventId: string, @Request() req: any) {
    return this.queueService.enterQueue(eventId, req.user.id);
  }

  @ApiOperation({ summary: '대기열 상태 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Param('eventId') eventId: string, @Request() req: any) {
    return this.queueService.getStatus(eventId, req.user.id);
  }

  @ApiOperation({ summary: '대기열 이탈' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('leave')
  async leaveQueue(@Param('eventId') eventId: string, @Request() req: any) {
    return this.queueService.leaveQueue(eventId, req.user.id);
  }

  @ApiOperation({ summary: '이벤트 대기열 정보' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('info')
  async getEventInfo(@Param('eventId') eventId: string) {
    return this.queueService.getEventInfo(eventId);
  }
}
