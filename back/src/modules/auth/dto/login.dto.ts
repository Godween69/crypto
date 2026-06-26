// back/src/modules/auth/dto/login.dto.ts
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsAllowedEmailDomain } from '../validators/allowed-email-domain.validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsAllowedEmailDomain()
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password!: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}