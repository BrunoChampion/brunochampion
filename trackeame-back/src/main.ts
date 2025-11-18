import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4000);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  const server = app.getHttpAdapter().getInstance();
  const handler = toNodeHandler(auth);
  const providers = (auth as unknown as { options?: { socialProviders?: Record<string, unknown> } })?.options?.socialProviders;
  console.log('[BetterAuth] available social providers:', providers ? Object.keys(providers) : 'none');

  server.use('/api/auth', async (req: Request, res: Response, next: NextFunction) => {
    console.log('[BetterAuth] handling', req.method, req.originalUrl);
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

