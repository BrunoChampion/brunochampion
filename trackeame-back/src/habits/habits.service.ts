import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto, UpdateHabitDto } from './dto/habit.dto';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createHabitDto: CreateHabitDto) {
    const habit = await this.prisma.habit.create({
      data: {
        ...createHabitDto,
        userId,
      },
    });

    return habit;
  }

  async findAll(userId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { userId },
      include: {
        timeEntries: {
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return habits;
  }

  async findOne(id: string, userId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id },
      include: {
        timeEntries: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this habit');
    }

    return habit;
  }

  async update(id: string, userId: string, updateHabitDto: UpdateHabitDto) {
    // Check if habit exists and belongs to user
    await this.findOne(id, userId);

    const habit = await this.prisma.habit.update({
      where: { id },
      data: updateHabitDto,
    });

    return habit;
  }

  async remove(id: string, userId: string) {
    // Check if habit exists and belongs to user
    await this.findOne(id, userId);

    await this.prisma.habit.delete({
      where: { id },
    });

    return { message: 'Habit deleted successfully' };
  }

  async getHabitMetrics(habitId: string, userId: string) {
    await this.findOne(habitId, userId);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        habitId,
        endTime: {
          not: null,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      habitId,
      entries,
    };
  }
}
