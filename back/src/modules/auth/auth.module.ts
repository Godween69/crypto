// back/src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { YandexStrategy } from './strategies/yandex.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard'; // <-- Импорт Guard для проверки ролей
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: c.get('JWT_ACCESS_TTL', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard, // <-- Регистрируем Guard в DI-контейнере
    YandexStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // Глобальная JWT-защита
  ],
  exports: [AuthService, JwtModule, RolesGuard], // <-- Экспортируем для использования в других модулях
})
export class AuthModule {}
