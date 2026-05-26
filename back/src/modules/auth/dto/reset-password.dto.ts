// back/src/modules/auth/dto/reset-password.dto.ts

import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // Токен сброса: 64 hex символа
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Некорректный формат токена' })
  token!: string;

  // Сильный пароль (те же правила что и при регистрации)
  @IsString()
  @MinLength(8, { message: 'Минимум 8 символов' })
  password!: string;
}
