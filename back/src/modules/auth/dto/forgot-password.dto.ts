// back/src/modules/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { IsAllowedEmailDomain } from '../validators/allowed-email-domain.validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsAllowedEmailDomain()
  email!: string;
}