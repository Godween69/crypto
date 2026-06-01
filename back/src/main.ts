// back/src/main.ts

import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first'); // форсируем IPv4, обходим зависания DNS в Node.js 17+

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const consoleLogLevel = isProd ? 'info' : 'debug';

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: 'debug',
      transports: [
        // Console: читаемый формат для разработки
        new winston.transports.Console({
          level: consoleLogLevel,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, ...meta }) =>
                `${timestamp} ${level}: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`,
            ),
          ),
        }),

        // Файл app.log: ежедневная ротация + сжатие + ограничение хранения
        new DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'debug',
          maxSize: '20m', // Макс. размер файла до ротации: 20 МБ
          maxFiles: '14d', // Хранить логи за 14 дней
          zippedArchive: true, // Сжимать старые файлы в .gz
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),

        // Файл error.log: только ошибки, отдельная ротация
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d', // Ошибки храним дольше — для расследования инцидентов
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  const logger = new Logger('Bootstrap');
  app.use(cookieParser.default());

  app.use(
    cookieSession({
      name: 'session',
      keys: [
        process.env.SESSION_SECRET ||
          'your-super-secret-key-change-in-production',
      ],
      maxAge: 10 * 60 * 1000,
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
