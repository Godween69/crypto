// front/src/utils/emailDomainValidator.ts

// ==========================================
// БЕЛЫЙ СПИСОК ДОМЕНОВ
// ==========================================
// Российские почтовые сервисы (разрешены дополнительно к .ru/.рф доменам)
export const ALLOWED_EMAIL_DOMAINS = [
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

/**
 * Извлекает TLD из домена (поддерживает com.ru, net.ru и т.д.)
 */
function extractTLD(domain: string): string {
  const parts = domain.split('.');
  if (parts.length >= 3) {
    const twoLevelTLD = parts.slice(-2).join('.');
    if (['com.ru', 'net.ru', 'org.ru', 'pp.ru', 'msk.ru', 'spb.ru', 'nov.ru'].includes(twoLevelTLD)) {
      return twoLevelTLD;
    }
  }
  return parts[parts.length - 1];
}

/**
 * Проверяет, является ли TLD российским
 */
function isRussianTLD(tld: string): boolean {
  return RUSSIAN_TLDS.includes(tld.toLowerCase());
}

/**
 * Результат проверки домена
 */
export interface EmailDomainValidationResult {
  isValid: boolean;
  isRussianTLD: boolean;
  isWhitelisted: boolean;
  domain: string;
  tld: string;
  message: string;
}

/**
 * Проверяет email на соответствие требованиям РФ
 */
export function validateEmailDomain(email: string): EmailDomainValidationResult {
  if (!email || !email.includes('@')) {
    return {
      isValid: false,
      isRussianTLD: false,
      isWhitelisted: false,
      domain: '',
      tld: '',
      message: '',
    };
  }

  const emailParts = email.toLowerCase().trim().split('@');
  if (emailParts.length !== 2) {
    return {
      isValid: false,
      isRussianTLD: false,
      isWhitelisted: false,
      domain: '',
      tld: '',
      message: 'Некорректный формат email',
    };
  }

  const domain = emailParts[1];
  const tld = extractTLD(domain);

  // Проверка 1: Российский TLD — всегда разрешаем
  if (isRussianTLD(tld)) {
    return {
      isValid: true,
      isRussianTLD: true,
      isWhitelisted: false,
      domain,
      tld,
      message: '✓ Российский домен',
    };
  }

  // Проверка 2: Белый список доменов
  const isWhitelisted = ALLOWED_EMAIL_DOMAINS.includes(domain);
  
  if (isWhitelisted) {
    return {
      isValid: true,
      isRussianTLD: false,
      isWhitelisted: true,
      domain,
      tld,
      message: '✓ Разрешённый сервис',
    };
  }

  // Отклонено
  const allowedList = ALLOWED_EMAIL_DOMAINS.join(', ');
  return {
    isValid: false,
    isRussianTLD: false,
    isWhitelisted: false,
    domain,
    tld,
    message: `В соответствии с законодательством РФ разрешено использовать только почту российских сервисов: ${allowedList} и все домены .ru/.рф`,
  };
}

/**
 * Возвращает краткое сообщение для UI (без списка доменов)
 */
export function getShortValidationMessage(result: EmailDomainValidationResult): string {
  if (result.isValid) {
    return result.message;
  }
  return 'Используйте почту российских сервисов (.ru, .рф)';
}