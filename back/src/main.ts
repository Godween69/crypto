// back/src/main.ts

import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import * as cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const consoleLogLevel = isProd ? 'info' : 'debug';

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      logger: WinstonModule.createLogger({
        level: 'debug',
        transports: [
          new winston.transports.Console({
            level: consoleLogLevel,
            format: winston.format.combine(
              winston.format.timestamp({ format: 'DD-MM HH:mm:ss' }),
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) =>
                  `${timestamp} ${level}: ${message}${Object.keys(meta).length
                    ? ' ' + JSON.stringify(meta)
                    : ''
                  }`,
              ),
            ),
          }),

          new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'debug',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),

          new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    },
  );

  const logger = new Logger('Bootstrap');
  app.set('trust proxy', 1);
  app.use(cookieParser.default());
  app.use(
    cookieSession({
      name: 'session',

      keys: [
        process.env.SESSION_SECRET ||
        'CHANGE_ME_IN_PRODUCTION',
      ],

      maxAge: 30 * 60 * 1000, // 30 min

      httpOnly: true,

      secure: isProd, // MUST be true in HTTPS prod

      sameSite: 'lax',

      /**
       * важно для прод-домена
       * чтобы cookie ходили между api.* и фронтом
       */
      domain: isProd ? '.dvbstudio.ru' : undefined,

      signed: true,
    }),
  );

  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, X-Client-Fingerprint',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  await app.listen(port);

  logger.log(
    `🚀 App running on http://localhost:${port} (${isProd ? 'production' : 'development'})`,
  );
}

bootstrap();