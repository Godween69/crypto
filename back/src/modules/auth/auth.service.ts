// back/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private cls: ClsService,
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
    this.logger.log(`[Auth:Login] Попытка входа: ${dto.email}`);

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
    return this.issueTokenPair(user, meta);
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

    // Ищем сессию с bypass
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

    // Генерируем новые токены ВНУТРИ транзакции для гарантии уникальности
    const tokens = await this.cls.run(async () => {
      this.cls.set('bypassUserIdFilter', true);

      return this.prisma.x.$transaction(async (tx) => {
        // Атомарно удаляем ВСЕ сессии с этим refreshToken
        // Это предотвращает race condition: если два запроса пришли одновременно,
        // первый удалит сессию, второй не найдёт её и транзакция откатится
        const deleted = await tx.refreshSession.deleteMany({
          where: { refreshToken: oldRefreshToken },
        });

        // Если сессия уже была удалена другим параллельным запросом — это не ошибка,
        // просто возвращаем null и обрабатываем снаружи
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

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

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
          `[Auth:Refresh] Токены обновлены для userId=${session.userId}`,
        );
        return {
          accessToken,
          refreshToken: newRefreshToken,
          expiresAt: expiresAt.getTime(),
        };
      });
    });

    // Если транзакция вернула null — сессия была обработана другим запросом
    // Пытаемся найти новую сессию по userId (она уже создана параллельным запросом)
    if (!tokens) {
      this.logger.debug(
        `[Auth:Refresh] Повторная попытка после race condition для userId=${session.userId}`,
      );
      throw new UnauthorizedException('Сессия уже обновлена, повторите запрос');
    }

    return tokens;
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

  private async issueTokenPair(
    user: { id: string; email: string },
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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

    this.logger.log(`[Auth:IssueTokens] Токены выданы: userId=${user.id}`);
    return { accessToken, refreshToken, expiresAt: expiresAt.getTime() };
  }
}
