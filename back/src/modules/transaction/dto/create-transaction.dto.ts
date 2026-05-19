// back\src\modules\transaction\dto\create-transaction.dto.ts

import {
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  symbol!: string;

  @IsIn(['BUY', 'SELL'])
  type!: 'BUY' | 'SELL';

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  // Опциональная дата операции
  // Если не передано — сервис использует createdAt = now()
  @IsOptional()
  @IsDateString()
  date?: string; // Формат: "2026-05-18" (ISO 8601, без времени)
}
