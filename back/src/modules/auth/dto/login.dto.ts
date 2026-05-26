// back/src/modules/auth/dto/login.dto.ts

import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password!: string;

  // Remember me: увеличивает TTL refresh cookie с 30 дней до 365 дней
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}