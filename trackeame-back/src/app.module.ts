import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HabitsModule } from './habits/habits.module';
import { TimerModule } from './timer/timer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HabitsModule,
    TimerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
