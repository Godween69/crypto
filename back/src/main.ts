// back\src\main.ts

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // ────── WINSTON LOGGER ──────
    logger: WinstonModule.createLogger({
      transports: [
        // консоль (dev)
        new winston.transports.Console({
          format: winston.format.combine(
            // Генерируем таймстамп
            winston.format.timestamp({ format: 'DD-MM HH:mm:ss' }),
            // Красим уровень лога
            winston.format.colorize(),
            winston.format.printf(
              // Собираем строку: [Время] Уровень: Сообщение
              ({ timestamp, level, message }) =>
                `${timestamp} ${level}: ${message}`,
            ),
          ),
        }),

        // общий лог файл
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(), // JSON удобнее для чтения файлами/системами логирования
          ),
        }),

        // только ошибки
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

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
