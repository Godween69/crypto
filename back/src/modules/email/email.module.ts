// back/src/modules/email/email.module.ts

import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Глобальный модуль — доступен во всех частях приложения без импорта
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
