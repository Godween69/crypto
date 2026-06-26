// back/src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { IsAllowedEmailDomain } from '../validators/allowed-email-domain.validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsAllowedEmailDomain()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль минимум 8 символов' })
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(3, { message: 'Имя минимум 3 символа' })
  @MaxLength(64)
  displayName!: string;
}