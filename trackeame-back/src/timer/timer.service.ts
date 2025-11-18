import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimerService {
  constructor(private prisma: PrismaService) {}

  async startTimer(userId: string, habitId: string) {
    // Verify habit exists and belongs to user
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this habit');
    }

    // Check if there's already an active timer for this habit
    const activeTimer = await this.prisma.timeEntry.findFirst({
      where: {
        habitId,
        endTime: null,
      },
    });

    if (activeTimer) {
      throw new BadRequestException('There is already an active timer for this habit');
    }

    // Create new time entry
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        habitId,
        startTime: new Date(),
      },
      include: {
        habit: true,
      },
    });

    return timeEntry;
  }

  async stopTimer(userId: string, timeEntryId: string) {
    // Find the time entry
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        habit: true,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Verify user owns this habit
    if (timeEntry.habit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this time entry');
    }

    // Check if already stopped
    if (timeEntry.endTime) {
      throw new BadRequestException('This timer has already been stopped');
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - timeEntry.startTime.getTime()) / 1000);

    // Update time entry
    const updatedTimeEntry = await this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        endTime,
        duration,
      },
      include: {
        habit: true,
      },
    });

    return updatedTimeEntry;
  }

  async getActiveTimer(userId: string, habitId?: string) {
    const where: any = {
      endTime: null,
      habit: {
        userId,
      },
    };

    if (habitId) {
      where.habitId = habitId;
    }

    const activeTimer = await this.prisma.timeEntry.findFirst({
      where,
      include: {
        habit: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return activeTimer;
  }

  async getTimeEntries(userId: string, habitId?: string) {
    const where: any = {
      habit: {
        userId,
      },
      endTime: {
        not: null,
      },
    };

    if (habitId) {
      where.habitId = habitId;
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        habit: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 50,
    });

    return timeEntries;
  }
}
