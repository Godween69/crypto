// back/src/modules/auth/dto/login.dto.ts

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Fingerprint браузера для защиты от кражи refresh-токена
  @IsOptional()
  @IsString()
  fingerprint?: string;
}