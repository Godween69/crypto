// back/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
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
import type { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Ключ префикса для Redis при хранении reset-токенов
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
  ) {}

  async register(
    dto: RegisterDto,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    this.logger.log(`[Auth:Register] Начало регистрации: ${dto.email}`);

    const exists = await this.prisma.x.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      this.logger.warn(`[Auth:Register] Email уже занят: ${dto.email}`);
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.x.user.create({
      data: { email: dto.email, passwordHash, displayName: dto.displayName },
    });

    this.logger.log(
      `[Auth:Register] Пользователь создан: id=${user.id}, email=${dto.email}`,
    );
    return this.issueTokenPair(user, meta);
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

    // Определяем rememberMe из оставшегося TTL сессии
    // Если сессия истекает более чем через 60 дней — считаем что rememberMe был true
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
        };
        const accessToken = await this.jwt.signAsync(jwtPayload, {
          expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
        });
        const newRefreshToken = await this.jwt.signAsync(jwtPayload, {
          expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
        });

        // Сохраняем rememberMe при ротации
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

  // Запрос сброса пароля — генерируем токен и шлём email
  async forgotPassword(email: string): Promise<void> {
    this.logger.log(`[Auth:ForgotPassword] Запрос сброса для: ${email}`);

    const user = await this.prisma.x.user.findUnique({
      where: { email },
    });

    // Всегда отвечаем "письмо отправлено" — защита от enumeration атак
    // Даже если юзера нет, не даём злоумышленнику узнать это
    if (!user) {
      this.logger.warn(
        `[Auth:ForgotPassword] Пользователь не найден, но отвечаем успешно: ${email}`,
      );
      return;
    }

    // Генерируем криптографически стойкий токен
    const token = crypto.randomBytes(32).toString('hex');

    // В Redis храним ХЭШ токена (защита от утечки Redis)
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

    // Отправляем письмо (асинхронно, не блокируем ответ)
    await this.email.sendPasswordReset(email, token);
  }

  // Сброс пароля по токену
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.log(`[Auth:ResetPassword] Попытка сброса пароля`);

    // Хэшируем полученный токен для поиска в Redis
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

    // Обновляем пароль
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      // Транзакция: обновляем пароль и удаляем все активные сессии
      await this.prisma.x.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: stored.userId },
          data: { passwordHash },
        });

        // КРИТИЧНО: после сброса пароля удаляем ВСЕ refresh сессии
        // Это защищает от сценария "аккаунт скомпрометирован, злоумышленник залогинен"
        await tx.refreshSession.deleteMany({
          where: { userId: stored.userId },
        });
      });

      // Удаляем использованный токен из Redis
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
    user: { id: string; email: string },
    meta: { ip: string; fingerprint?: string },
    rememberMe = false,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
    });

    // 30 дней по умолчанию, 365 дней если rememberMe
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
      `[Auth:IssueTokens] Токены выданы: userId=${user.id}, rememberMe=${rememberMe}, refreshTtl=${refreshTtlDays}d`,
    );
    return { accessToken, refreshToken, expiresAt: expiresAt.getTime() };
  }
}
