// back/src/modules/auth/strategies/yandex.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
// Импортируем тип из нашего декларационного файла (не из passport-yandex)
import type { YandexProfile } from 'passport-yandex';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const YandexStrategyImpl = require('passport-yandex').Strategy;

@Injectable()
export class YandexStrategy extends PassportStrategy(
  YandexStrategyImpl,
  'yandex',
) {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('YANDEX_CLIENT_ID')!,
      clientSecret: config.get<string>('YANDEX_CLIENT_SECRET')!,
      callbackURL: config.get<string>('YANDEX_CALLBACK_URL')!,
      scope: ['login:email'],
      state: true, // CSRF-защита через state
      passReqToCallback: true, // Передаём req в validate()
    });
  }

  async validate(
    req: any, // req добавлен благодаря passReqToCallback
    accessToken: string,
    refreshToken: string,
    profile: YandexProfile,
    done: Function,
  ) {
    // Передаём профиль в контроллер
    done(null, profile);
  }
}
/*
1. GET /auth/yandex
   ↓
2. cookie-session middleware создаёт req.session (пустой объект)
   ↓
3. Passport генерирует state и сохраняет:
   req.session['oauth2:yandex'] = { state: 'random_csrf_token' }
   ↓
4. cookie-session автоматически сериализует req.session в JSON,
   подписывает ключом SESSION_SECRET и сохраняет в httpOnly cookie "session"
   ↓
5. Passport редиректит на Яндекс с state в URL
   ↓
6. Пользователь авторизуется в Яндексе
   ↓
7. Яндекс редиректит на /auth/yandex/callback?code=...&state=random_csrf_token
   ↓
8. cookie-session читает cookie "session", проверяет подпись, десериализует → req.session
   ↓
9. Passport читает req.session['oauth2:yandex'].state
   ↓
10. Passport сравнивает state из URL с state из сессии
    ↓
11. ✅ Совпадает → CSRF-защита пройдена
    ↓
12. Passport обменивает code на access_token → запрашивает профиль
    ↓
13. yandexCallback() создаёт/обновляет пользователя → устанавливает JWT-куки
    ↓
14. Редирект на /oauth-success */
