// back/src/modules/auth/dto/forgot-password.dto.ts

import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email!: string;
}
