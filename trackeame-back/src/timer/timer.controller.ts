import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimerService } from './timer.service';
import { StartTimerDto } from './dto/timer.dto';
import { SessionGuard } from '../auth/session.guard';

@Controller('timer')
@UseGuards(SessionGuard)
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  @Post('start')
  startTimer(@Request() req, @Body() startTimerDto: StartTimerDto) {
    return this.timerService.startTimer(req.user.id, startTimerDto.habitId);
  }

  @Post('stop/:id')
  stopTimer(@Request() req, @Param('id') timeEntryId: string) {
    return this.timerService.stopTimer(req.user.id, timeEntryId);
  }

  @Get('active')
  getActiveTimer(@Request() req, @Query('habitId') habitId?: string) {
    return this.timerService.getActiveTimer(req.user.id, habitId);
  }

  @Get('entries')
  getTimeEntries(@Request() req, @Query('habitId') habitId?: string) {
    return this.timerService.getTimeEntries(req.user.id, habitId);
  }
}
