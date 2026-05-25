// back\src\redis\redis.module.ts

import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Делает RedisService доступным во всех модулях без явного импорта
@Module({
  providers: [RedisService],
  exports: [RedisService], // КРИТИЧНО: без exports другие модули не получат доступ
})
export class RedisModule {}
