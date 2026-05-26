// back/src/app.module.ts

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { UserContextInterceptor } from './modules/auth/interceptors/user-context.interceptor';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    // ВАЖНО: Включаем middleware для создания CLS контекста на каждый запрос
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    PrismaModule,
    AuthModule,
    TransactionModule,
    PortfolioModule,
    MarketModule,
    RedisModule,
    EmailModule,
  ],
  providers: [
    // Интерцептор выполняется ПОСЛЕ Guards, когда req.user уже есть
    { provide: APP_INTERCEPTOR, useClass: UserContextInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Cookie parser должен идти первым
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
