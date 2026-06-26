// back/src/modules/auth/auth.service.ts

/* Как течёт данные и почему это production-ready
Регистрация → создаётся User(emailVerified: false) → токен в Redis (24ч) → письмо.
Попытка входа → login() проверяет emailVerified → если false, бросает 401 → вход заблокирован.
Клик по ссылке → verifyEmail() проверяет Redis → находит userId → запрашивает User из БД.
TS-защита → if (!currentUser) гарантирует, что ниже currentUser.role безопасен → компилятор не ругается.
Идемпотентность → если emailVerified === true, пропускаем мутации и сразу выдаём сессию.
Крон-очистка → ежедневно в 03:00 удаляет записи, где emailVerified: false и createdAt < 24ч. Это предотвращает накопление мусора и освобождает email для повторной регистрации.*/

import { Role, AuthProvider } from '@prisma/client';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import type { YandexProfile } from 'passport-yandex';

import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const RESET_TOKEN_PREFIX = 'password_reset:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private cls: ClsService,
    private redis: RedisService,
    private email: EmailService,
  ) { }

  // OAuth вход/регистрация через Яндекс
  async yandexLogin(
    profile: YandexProfile,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    this.logger.log(`[Auth:Yandex] Обработка профиля: yandexId=${profile.id}`);

    // Извлекаем email: приоритет default_email → emails[0]
    const email = profile._json?.default_email ?? profile.emails?.[0]?.value;
    if (!email) {
      this.logger.warn(
        `[Auth:Yandex] Профиль не содержит email: yandexId=${profile.id}`,
      );
      throw new BadRequestException(
        'Яндекс-аккаунт не предоставляет email. Разрешите доступ к почте.',
      );
    }

    // Извлекаем имя для отображения
    const displayName = profile.displayName || profile._json?.login || null;

    // Ищем пользователя по yandexId или email
    let user = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      return this.prisma.x.user.findFirst({
        where: { OR: [{ yandexId: profile.id }, { email }] },
      });
    });

    if (!user) {
      // 🆕 Новый пользователь: создаём с подтверждённым email
      // Яндекс уже верифицировал почту, поэтому emailVerified: true
      user = await this.prisma.x.user.create({
        data: {
          email,
          displayName,
          yandexId: profile.id,
          authProvider: AuthProvider.YANDEX,
          emailVerified: true,
          passwordHash: '', // OAuth-пользователи не используют пароль
        },
      });
      this.logger.log(`[Auth:Yandex] Создан новый пользователь: ${email}`);
    } else if (!user.yandexId) {
      // 🔗 Существующий пользователь (через email/password): привязываем Яндекс
      user = await this.prisma.x.user.update({
        where: { id: user.id },
        data: { yandexId: profile.id, authProvider: AuthProvider.YANDEX },
      });
      this.logger.log(`[Auth:Yandex] Яндекс привязан к аккаунту: ${email}`);
    } else {
      // ✅ Существующий OAuth-пользователь: просто вход
      this.logger.log(`[Auth:Yandex] Вход через Яндекс: ${email}`);
    }

    // Выпускаем JWT-сессию (токены + куки)
    return this.issueTokenPair(user, meta);
  }

  // Регистрация БЕЗ авто-логина. Отправляем письмо верификации.
  async register(
    dto: RegisterDto,
    meta: { ip: string; fingerprint?: string },
  ): Promise<{ message: string }> {
    this.logger.log(`[Auth:Register] Начало регистрации: ${dto.email}`);

    // Логирование для аналитики (валидация уже прошла на уровне DTO)
    const domain = dto.email.split('@')[1]?.toLowerCase();
    this.logger.debug(`[Auth:Register] Домен email: ${domain}`);

    const exists = await this.prisma.x.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      this.logger.warn(`[Auth:Register] Email уже занят: ${dto.email}`);
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.x.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        emailVerified: false,
      },
    });

    // Генерируем токен верификации
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = 86400; // 24 часа

    await this.redis.set(
      `email_verify:${tokenHash}`,
      JSON.stringify({ userId: user.id, email: user.email }),
      ttl,
    );
    this.logger.log(
      `[Auth:Register] Токен верификации создан для userId=${user.id}`,
    );

    // Отправляем письмо (не блокируем ответ)
    await this.email.sendEmailVerification(dto.email, token);

    this.logger.log(
      `[Auth:Register] Регистрация успешна, письмо отправлено: ${dto.email}`,
    );
    return {
      message: 'Регистрация успешна. Проверьте почту для подтверждения email.',
    };
  }

  // Подтверждение email по токену из письма (идемпотентный метод)
  async verifyEmail(
    token: string,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    this.logger.log(`[Auth:VerifyEmail] Попытка подтверждения email`);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `email_verify:${tokenHash}`;
    const storedRaw = await this.redis.get<string>(redisKey);

    if (!storedRaw) {
      this.logger.warn(`[Auth:VerifyEmail] Токен не найден или истёк`);
      throw new BadRequestException(
        'Токен подтверждения недействителен или истёк',
      );
    }

    let stored: { userId: string; email: string };
    try {
      stored = JSON.parse(storedRaw);
    } catch {
      throw new BadRequestException('Внутренняя ошибка формата токена');
    }

    // Проверяем текущий статус пользователя перед обновлением
    const currentUser = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      return this.prisma.x.user.findUnique({ where: { id: stored.userId } });
    });

    // Явная проверка на null устраняет TS-ошибку и защищает от удалённых аккаунтов
    if (!currentUser) {
      this.logger.warn(
        `[Auth:VerifyEmail] Пользователь не найден: userId=${stored.userId}`,
      );
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Если уже подтверждён — просто выдаём токены (идемпотентность)
    if (currentUser.emailVerified) {
      this.logger.log(
        `[Auth:VerifyEmail] Email уже подтверждён для userId=${stored.userId}. Выдача токенов.`,
      );
      await this.redis.del(redisKey).catch(() => { });
      return this.issueTokenPair(currentUser, meta);
    }

    // Помечаем email как подтверждённый и удаляем токен
    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      await this.prisma.x.user.update({
        where: { id: stored.userId },
        data: { emailVerified: true },
      });
      await this.redis.del(redisKey);
    });

    this.logger.log(
      `[Auth:VerifyEmail] Email подтверждён для userId=${stored.userId}`,
    );

    // Выдача токенов с защитой от race condition (P2002)
    try {
      return await this.issueTokenPair(currentUser, meta);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.warn(
          `[Auth:VerifyEmail] Race condition при создании сессии, повторная генерация`,
        );
        return await this.issueTokenPair(currentUser, meta);
      }
      throw err;
    }
  }

  // Повторная отправка письма верификации
  async resendVerification(email: string): Promise<{ message: string }> {
    this.logger.log(
      `[Auth:ResendVerification] Запрос повторной отправки для: ${email}`,
    );
    const user = await this.prisma.x.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      // Защита от enumeration
      return {
        message: 'Если аккаунт существует и не подтверждён, письмо отправлено.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.redis.set(
      `email_verify:${tokenHash}`,
      JSON.stringify({ userId: user.id, email: user.email }),
      86400,
    );
    await this.email.sendEmailVerification(email, token);

    return { message: 'Письмо с подтверждением отправлено повторно.' };
  }

  async login(
    dto: LoginDto,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    this.logger.log(
      `[Auth:Login] Попытка входа: ${dto.email}, rememberMe=${dto.rememberMe ?? false}`,
    );
    const user = await this.prisma.x.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.logger.warn(`[Auth:Login] Пользователь не найден: ${dto.email}`);
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (!user.emailVerified) {
      this.logger.warn(`[Auth:Login] Email не подтверждён: ${dto.email}`);
      throw new UnauthorizedException(
        'Email не подтверждён. Проверьте почту или запросите повторное письмо.',
      );
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`[Auth:Login] Неверный пароль: ${dto.email}`);
      throw new UnauthorizedException('Неверный email или пароль');
    }
    this.logger.log(`[Auth:Login] Вход успешен: userId=${user.id}`);
    return this.issueTokenPair(user, meta, dto.rememberMe);
  }

  async refresh(
    oldRefreshToken: string,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    this.logger.debug(`[Auth:Refresh] Попытка обновления токена`);

    if (!oldRefreshToken) {
      this.logger.warn(`[Auth:Refresh] Refresh token отсутствует`);
      throw new UnauthorizedException('Refresh token отсутствует');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.decode(oldRefreshToken) as JwtPayload;
    } catch {
      this.logger.warn(`[Auth:Refresh] Невалидный формат refresh token`);
      throw new UnauthorizedException('Невалидный refresh token');
    }
    if (!payload?.sub) {
      this.logger.warn(`[Auth:Refresh] В токене отсутствует sub (userId)`);
      throw new UnauthorizedException('Невалидный refresh token');
    }

    const session = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      return this.prisma.x.refreshSession.findUnique({
        where: { refreshToken: oldRefreshToken },
        include: { user: true },
      });
    });

    if (!session) {
      this.logger.warn(
        `[Auth:Refresh] Сессия не найдена для userId=${payload.sub}`,
      );
      throw new UnauthorizedException('Сессия не найдена');
    }

    this.logger.debug(
      `[Auth:Refresh] Сессия найдена: sessionId=${session.id}, userId=${session.userId}`,
    );

    if (session.expiresAt < new Date()) {
      this.logger.warn(
        `[Auth:Refresh] Сессия истекла: sessionId=${session.id}`,
      );
      await this.cls.run(async () => {
        this.cls.set('bypassUserIdFilter', true);
        await this.prisma.x.refreshSession.deleteMany({
          where: { id: session.id },
        });
      });
      throw new UnauthorizedException('Сессия истекла');
    }

    if (
      session.fingerprint &&
      meta.fingerprint &&
      session.fingerprint !== meta.fingerprint
    ) {
      this.logger.warn(
        `[Auth:Refresh] Компрометация сессии: userId=${session.userId}`,
      );
      await this.cls.run(async () => {
        this.cls.set('bypassUserIdFilter', true);
        await this.prisma.x.refreshSession.deleteMany({
          where: { userId: session.userId },
        });
      });
      throw new UnauthorizedException(
        'Обнаружена попытка компрометации сессии',
      );
    }

    const daysUntilExpiry =
      (session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const rememberMe = daysUntilExpiry > 60;

    const tokens = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      return this.prisma.x.$transaction(async (tx) => {
        const deleted = await tx.refreshSession.deleteMany({
          where: { refreshToken: oldRefreshToken },
        });

        if (deleted.count === 0) {
          this.logger.warn(
            `[Auth:Refresh] Сессия уже удалена параллельным запросом: userId=${session.userId}`,
          );
          return null;
        }

        const jwtPayload: JwtPayload = {
          sub: session.userId,
          email: session.user.email,
          role: session.user.role,
        };
        const accessToken = await this.jwt.signAsync(jwtPayload, {
          expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
        });
        const newRefreshToken = await this.jwt.signAsync(jwtPayload, {
          expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
        });

        const refreshTtlDays = rememberMe ? 365 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

        await tx.refreshSession.create({
          data: {
            userId: session.userId,
            refreshToken: newRefreshToken,
            fingerprint: meta.fingerprint ?? null,
            ip: meta.ip,
            expiresAt,
          } as any,
        });

        this.logger.log(
          `[Auth:Refresh] Токены обновлены для userId=${session.userId}, rememberMe=${rememberMe}`,
        );
        return {
          accessToken,
          refreshToken: newRefreshToken,
          expiresAt: expiresAt.getTime(),
        };
      });
    });

    if (!tokens) {
      this.logger.debug(
        `[Auth:Refresh] Повторная попытка после race condition для userId=${session.userId}`,
      );
      throw new UnauthorizedException('Сессия уже обновлена, повторите запрос');
    }

    return tokens;
  }

  async forgotPassword(email: string): Promise<void> {
    this.logger.log(`[Auth:ForgotPassword] Запрос сброса для: ${email}`);
    const user = await this.prisma.x.user.findUnique({ where: { email } });

    if (!user) {
      this.logger.warn(
        `[Auth:ForgotPassword] Пользователь не найден, но отвечаем успешно: ${email}`,
      );
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = this.config.get<number>('PASSWORD_RESET_TTL', 3600);

    await this.redis.set(
      `${RESET_TOKEN_PREFIX}${tokenHash}`,
      JSON.stringify({ userId: user.id, email: user.email }),
      ttl,
    );

    this.logger.log(
      `[Auth:ForgotPassword] Токен создан для userId=${user.id}, TTL=${ttl}с`,
    );
    await this.email.sendPasswordReset(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.log(`[Auth:ResetPassword] Попытка сброса пароля`);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `${RESET_TOKEN_PREFIX}${tokenHash}`;

    const storedRaw = await this.redis.get<string>(redisKey);
    if (!storedRaw) {
      this.logger.warn(`[Auth:ResetPassword] Токен не найден или истёк`);
      throw new BadRequestException('Токен сброса недействителен или истёк');
    }

    let stored: { userId: string; email: string };
    try {
      stored = JSON.parse(storedRaw);
    } catch {
      this.logger.error(
        `[Auth:ResetPassword] Некорректный формат данных в Redis`,
      );
      throw new BadRequestException('Внутренняя ошибка');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      await this.prisma.x.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: stored.userId },
          data: { passwordHash },
        });
        await tx.refreshSession.deleteMany({
          where: { userId: stored.userId },
        });
      });
      await this.redis.del(redisKey);
    });

    this.logger.log(
      `[Auth:ResetPassword] Пароль сброшен для userId=${stored.userId}, все сессии отозваны`,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    this.logger.log(`[Auth:Logout] Выход из системы`);
    if (refreshToken) {
      await this.cls.run(async () => {
        this.cls.set('bypassUserIdFilter', true);
        const result = await this.prisma.x.refreshSession.deleteMany({
          where: { refreshToken },
        });
        this.logger.log(`[Auth:Logout] Удалено сессий: ${result.count}`);
      });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    this.logger.log(
      `[Auth:LogoutAll] Выход со всех устройств: userId=${userId}`,
    );
    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      const result = await this.prisma.x.refreshSession.deleteMany({
        where: { userId },
      });
      this.logger.log(`[Auth:LogoutAll] Удалено сессий: ${result.count}`);
    });
  }

  // Выдача пары токенов. rememberMe влияет на TTL refresh cookie
  private async issueTokenPair(
    user: { id: string; email: string; role: Role },
    meta: { ip: string; fingerprint?: string },
    rememberMe = false,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
    });

    const refreshTtlDays = rememberMe ? 365 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      await this.prisma.x.refreshSession.create({
        data: {
          userId: user.id,
          refreshToken,
          fingerprint: meta.fingerprint ?? null,
          ip: meta.ip,
          expiresAt,
        } as any,
      });
    });

    this.logger.log(
      `[Auth:IssueTokens] Токены выданы: userId=${user.id}, role=${user.role}, rememberMe=${rememberMe}, refreshTtl=${refreshTtlDays}d`,
    );
    return { accessToken, refreshToken, expiresAt: expiresAt.getTime() };
  }

  // Крон: очистка неподтверждённых аккаунтов старше 24 часов
  @Cron('0 3 * * *') // Запускается ежедневно в 03:00
  async cleanupUnverifiedUsers() {
    this.logger.debug(
      '[Auth:Cleanup] Запуск очистки неподтверждённых пользователей',
    );
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 часа назад

    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);
      const deleted = await this.prisma.x.user.deleteMany({
        where: {
          emailVerified: false,
          createdAt: { lt: cutoff },
        },
      });
      if (deleted.count > 0) {
        this.logger.log(
          `[Auth:Cleanup] Удалено ${deleted.count} неподтверждённых аккаунтов старше 24ч`,
        );
      }
    });
  }
}
