// back/src/modules/auth/dto/register.dto.ts

import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
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
