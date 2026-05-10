import { IsString, IsNumber, IsIn, Min } from 'class-validator';

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
}
