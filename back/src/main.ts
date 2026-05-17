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
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),

        // общий лог файл
        new winston.transports.File({
          filename: 'logs/app.log',
        }),

        // только ошибки
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
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
