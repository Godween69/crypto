// back/src/main.ts

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common'; // <-- Импортируем Logger
import * as cookieParser from 'cookie-parser';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  // Определяем уровень логирования: в prod только info+, в dev — всё включая debug
  const isProd = process.env.NODE_ENV === 'production';
  const consoleLogLevel = isProd ? 'info' : 'debug';

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: 'debug',
      transports: [
        // Console: в dev показывает debug+, в prod только info+
        new winston.transports.Console({
          level: consoleLogLevel, // Winston фильтрует сообщения по этому порогу
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message }) =>
                `${timestamp} ${level}: ${message}`,
            ),
          ),
        }),
        // Файл app.log: все логи уровня debug+
        new winston.transports.File({
          filename: 'logs/app.log',
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Файл error.log: только ошибки
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

  // Используем NestJS Logger вместо прямого winston
  // Он автоматически использует Winston, настроенный выше
  const logger = new Logger('Bootstrap');

  // Включаем парсер кук
  app.use(cookieParser.default());

  // Получаем URL фронта из env с дефолтным значением
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
