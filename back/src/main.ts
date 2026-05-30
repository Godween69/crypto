// back/src/main.ts

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
// Дефолтный импорт вместо namespace import
import cookieSession from 'cookie-session';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const consoleLogLevel = isProd ? 'info' : 'debug';

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: 'debug',
      transports: [
        new winston.transports.Console({
          level: consoleLogLevel,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message }) =>
                `${timestamp} ${level}: ${message}`,
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  const logger = new Logger('Bootstrap');

  // 1. Парсер кук
  app.use(cookieParser.default());

  // 2. cookie-session: сохраняет req.session в подписанной httpOnly cookie
  // Passport использует req.session для хранения OAuth state (CSRF-защита)
  app.use(
    cookieSession({
      name: 'session',
      keys: [
        process.env.SESSION_SECRET ||
          'your-super-secret-key-change-in-production',
      ],
      maxAge: 10 * 60 * 1000, // 10 минут на OAuth-флоу
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      signed: true,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Client-Fingerprint',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);

  logger.log(
    `🚀 Приложение запущено на http://localhost:${port} (в режиме: ${isProd ? 'продакшена' : 'разработки'})`,
  );
}

bootstrap();
