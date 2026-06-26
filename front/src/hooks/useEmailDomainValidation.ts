// front/src/hooks/useEmailDomainValidation.ts
import { useState, useEffect } from 'react';
import { validateEmailDomain, type EmailDomainValidationResult } from '../utils/emailDomainValidator';

/**
 * Хук для real-time валидации email-домена
 * Возвращает статус валидации и сообщение для UI
 */
export function useEmailDomainValidation(email: string) {
  const [validation, setValidation] = useState<EmailDomainValidationResult>({
    isValid: false,
    isRussianTLD: false,
    isWhitelisted: false,
    domain: '',
    tld: '',
    message: '',
  });

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setValidation({
        isValid: false,
        isRussianTLD: false,
        isWhitelisted: false,
        domain: '',
        tld: '',
        message: '',
      });
      return;
    }

    // Debounce: проверяем только после паузы в вводе (300ms)
    const timer = setTimeout(() => {
      const result = validateEmailDomain(email);
      setValidation(result);
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  return validation;
}