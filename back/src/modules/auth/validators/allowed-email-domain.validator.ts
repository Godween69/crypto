// back/src/modules/auth/validators/allowed-email-domain.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Logger } from '@nestjs/common';

// ==========================================
// БЕЛЫЙ СПИСОК ДОМЕНОВ
// ==========================================
// Российские почтовые сервисы (разрешены дополнительно к .ru/.рф доменам)
const ALLOWED_EMAIL_DOMAINS = [
  'mail.ru',
  'yandex.ru',
  'ya.ru',
  'rambler.ru',
  'list.ru',
  'inbox.ru',
  'bk.ru',
  'me.ru',
  'yandex.com',
];

// Российские домены верхнего уровня (TLD)
// Все домены с этими TLD разрешены автоматически
const RUSSIAN_TLDS = [
  'ru',
  'рф', // кириллический
  'su',
  'com.ru',
  'net.ru',
  'org.ru',
  'pp.ru',
  'msk.ru',
  'spb.ru',
  'nov.ru',
];

@ValidatorConstraint({ name: 'isAllowedEmailDomain', async: false })
export class IsAllowedEmailDomainConstraint implements ValidatorConstraintInterface {
  private readonly logger = new Logger(IsAllowedEmailDomainConstraint.name);

  validate(email: string): boolean {
    if (!email) return true; // Пустой email обработается @IsEmail

    try {
      const emailParts = email.toLowerCase().trim().split('@');
      if (emailParts.length !== 2) return false;

      const domain = emailParts[1];
      const tld = this.extractTLD(domain);

      // Проверка 1: Российский TLD — всегда разрешаем
      if (this.isRussianTLD(tld)) {
        this.logger.debug(`[EmailValidator] ✅ Российский TLD "${tld}" — разрешено: ${email}`);
        return true;
      }

      // Проверка 2: Белый список доменов
      const isAllowed = ALLOWED_EMAIL_DOMAINS.includes(domain);

      if (isAllowed) {
        this.logger.debug(`[EmailValidator] ✅ Домен в белом списке — разрешено: ${email}`);
      } else {
        this.logger.warn(
          `[EmailValidator] ❌ Домен "${domain}" не разрешён — отклонено: ${email}`,
        );
      }

      return isAllowed;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`[EmailValidator] Ошибка валидации: ${error.message}`);
      }
      return false;
    }
  }

  defaultMessage(): string {
    const russianDomains = ALLOWED_EMAIL_DOMAINS.join(', ');
    return `В соответствии с законодательством РФ разрешено использовать только почту российских сервисов: ${russianDomains} и все домены .ru/.рф`;
  }

  // Извлечение TLD из домена (поддерживает com.ru, net.ru и т.д.)
  private extractTLD(domain: string): string {
    const parts = domain.split('.');
    if (parts.length >= 3) {
      const twoLevelTLD = parts.slice(-2).join('.');
      if (['com.ru', 'net.ru', 'org.ru', 'pp.ru', 'msk.ru', 'spb.ru', 'nov.ru'].includes(twoLevelTLD)) {
        return twoLevelTLD;
      }
    }
    return parts[parts.length - 1];
  }

  private isRussianTLD(tld: string): boolean {
    return RUSSIAN_TLDS.includes(tld.toLowerCase());
  }
}

export function IsAllowedEmailDomain(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedEmailDomainConstraint,
    });
  };
}