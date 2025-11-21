import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT ?? 4000);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_TRACKEAME_URL || 'http://localhost:3001',
    credentials: true,
  });

  const server = app.getHttpAdapter().getInstance();
  const handler = toNodeHandler(auth);
  const providers = (auth as unknown as { options?: { socialProviders?: Record<string, unknown> } })?.options?.socialProviders;
  console.log('[BetterAuth] available social providers:', providers ? Object.keys(providers) : 'none');

  const allowedOrigin = process.env.FRONTEND_TRACKEAME_URL ?? 'http://localhost:3001';

  server.use('/api/auth', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    handler(req, res).catch(next);
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

