import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto, UpdateHabitDto } from './dto/habit.dto';
import { SessionGuard } from '../auth/session.guard';

@Controller('habits')
@UseGuards(SessionGuard)
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Post()
  create(@Request() req, @Body() createHabitDto: CreateHabitDto) {
    return this.habitsService.create(req.user.id, createHabitDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.habitsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.habitsService.findOne(id, req.user.id);
  }

  @Get(':id/metrics')
  getMetrics(@Request() req, @Param('id') id: string) {
    return this.habitsService.getHabitMetrics(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateHabitDto: UpdateHabitDto,
  ) {
    return this.habitsService.update(id, req.user.id, updateHabitDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.habitsService.remove(id, req.user.id);
  }
}
