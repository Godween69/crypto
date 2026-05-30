// back/src/types/passport-yandex.d.ts

// TypeScript декларации для пакета passport-yandex
// Этот файл позволяет использовать стратегию с типобезопасностью

declare module 'passport-yandex' {
  import {
    Strategy as PassportStrategy,
    Profile,
    VerifyCallback,
  } from 'passport';

  // Профиль пользователя, возвращаемый Яндексом
  export interface YandexProfile extends Profile {
    id: string;
    displayName: string;
    emails?: Array<{ value: string; type?: string }>;
    photos?: Array<{ value: string }>;
    _json: {
      default_email?: string;
      login?: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
      real_name?: string;
      sex?: string;
      birthday?: string;
    };
  }

  // Опции для конструктора стратегии
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    state?: boolean;
    passReqToCallback?: boolean;
  }

  // Класс стратегии
  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: YandexProfile,
        done: VerifyCallback,
      ) => void,
    );
  }
}
