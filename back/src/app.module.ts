// back/src/app.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ClsModule } from 'nestjs-cls';
import cookieParser from 'cookie-parser';
import { TransactionModule } from './modules/transaction/transaction.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { MarketModule } from './modules/market/market.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserContextMiddleware } from './modules/auth/middleware/user-context.middleware';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    PrismaModule,
    AuthModule, // Подключён
    TransactionModule,
    PortfolioModule,
    MarketModule,
    RedisModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // cookie-parser парсит httpOnly cookies до обработки контроллерами
    consumer.apply(cookieParser()).forRoutes('*');
    // Записывает userId из request.user в CLS после Passport-валидации
    consumer.apply(UserContextMiddleware).forRoutes('*');
  }
}
