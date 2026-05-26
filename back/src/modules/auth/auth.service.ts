// back/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// Пара токенов, возвращаемая при логине/регистрации/refresh
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // Регистрация: создаём пользователя + первую пару токенов
  async register(
    dto: RegisterDto,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    // Проверяем уникальность email через bypass (модель User не user-scoped)
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists)
      throw new ConflictException('Пользователь с таким email уже существует');

    const passwordHash = await bcrypt.hash(dto.password, 12); // 12 раундов — оптимально для CPU
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, displayName: dto.displayName },
    });

    return this.issueTokenPair(user, meta);
  }

  // Логин: проверяем пароль, выдаём токены
  async login(
    dto: LoginDto,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.issueTokenPair(user, meta);
  }

  // Refresh: находим сессию, валидируем, выпускаем новую пару (ротация)
  async refresh(
    oldRefreshToken: string,
    meta: { ip: string; fingerprint?: string },
  ): Promise<TokenPair> {
    if (!oldRefreshToken)
      throw new UnauthorizedException('Refresh token отсутствует');

    // Декодируем без верификации чтобы получить payload для поиска
    let payload: JwtPayload;
    try {
      payload = this.jwt.decode(oldRefreshToken) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Невалидный refresh token');
    }
    if (!payload?.sub)
      throw new UnauthorizedException('Невалидный refresh token');

    // Ищем сессию через bypass (RefreshSession — user-scoped модель)
    const session = await this.prisma.refreshSession.findUnique({
      where: { refreshToken: oldRefreshToken },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Сессия не найдена');
    if (session.expiresAt < new Date()) {
      await this.prisma.refreshSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Сессия истекла');
    }

    // Детектор кражи: fingerprint изменился → закрываем ВСЕ сессии пользователя
    if (
      session.fingerprint &&
      meta.fingerprint &&
      session.fingerprint !== meta.fingerprint
    ) {
      await this.prisma.refreshSession.deleteMany({
        where: { userId: session.userId },
      });
      throw new UnauthorizedException(
        'Обнаружена попытка компрометации сессии',
      );
    }

    // Удаляем старую сессию и создаём новую (ротация)
    await this.prisma.refreshSession.delete({ where: { id: session.id } });
    return this.issueTokenPair(session.user, meta);
  }

  // Логаут: удаляем конкретную сессию
  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshSession.deleteMany({ where: { refreshToken } });
    }
  }

  // Логаут всех устройств
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshSession.deleteMany({ where: { userId } });
  }

  // Генерирует access + refresh и сохраняет сессию в БД
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
    expiresAt.setDate(expiresAt.getDate() + 30); // TTL refresh-сессии в БД

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        refreshToken,
        fingerprint: meta.fingerprint ?? null,
        ip: meta.ip,
        expiresAt,
      } as any, // userId внедряется middleware, но здесь передаём явно для ясности
    });

    return { accessToken, refreshToken, expiresAt: expiresAt.getTime() };
  }
}
