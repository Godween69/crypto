// back/src/modules/auth/auth.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Для OAuth-гардов
import { ConfigService } from '@nestjs/config'; // Для чтения FRONTEND_URL
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { YandexProfile } from 'passport-yandex';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private auth: AuthService,
    private config: ConfigService, // <-- Инжект для чтения FRONTEND_URL
  ) {}

  // ===== БАЗОВЫЕ ENDPOINTS =====

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { id: string; email: string }) {
    this.logger.log(
      `[Auth:Me] Запрос профиля: userId=${user.id}, email=${user.email}`,
    );
    return { id: user.id, email: user.email };
  }

  // Регистрация без авто-логина, только отправка письма
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    this.logger.log(`[AuthController] Начало регистрации: ${dto.email}`);
    const result = await this.auth.register(dto, this.extractMeta(req));
    this.logger.log(`[AuthController] Регистрация завершена: ${dto.email}`);
    return result;
  }

  // Подтверждение email по токену из письма
  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body() body: { token: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`[AuthController] Подтверждение email по токену`);
    const tokens = await this.auth.verifyEmail(
      body.token,
      this.extractMeta(req),
    );
    this.setCookieTokens(res, tokens, false);
    this.logger.log(`[AuthController] Email подтверждён, куки установлены`);
    return { ok: true, message: 'Email успешно подтверждён' };
  }

  // Повторная отправка письма верификации
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    this.logger.log(
      `[AuthController] Запрос повторной верификации для: ${body.email}`,
    );
    return this.auth.resendVerification(body.email);
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(
      `[AuthController] Начало входа: ${dto.email}, rememberMe=${dto.rememberMe ?? false}`,
    );
    const tokens = await this.auth.login(dto, this.extractMeta(req));
    this.setCookieTokens(res, tokens, dto.rememberMe ?? false);
    this.logger.log(
      `[AuthController] Куки установлены для входа: ${dto.email}`,
    );
    return { ok: true };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefresh = req.cookies?.refresh_token;
    if (!oldRefresh) {
      this.logger.warn(`[AuthController] Refresh token отсутствует в куках`);
      throw new UnauthorizedException('Refresh token отсутствует');
    }
    this.logger.log(`[AuthController] Обновление токенов`);
    const tokens = await this.auth.refresh(oldRefresh, this.extractMeta(req));

    // Определяем rememberMe из TTL сессии (>60 дней = было true)
    const daysUntilExpiry =
      (tokens.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    const rememberMe = daysUntilExpiry > 60;
    this.setCookieTokens(res, tokens, rememberMe);

    this.logger.log(
      `[AuthController] Новые куки установлены при рефреше, rememberMe=${rememberMe}`,
    );
    return { ok: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`[AuthController] Запрос сброса пароля для: ${dto.email}`);
    await this.auth.forgotPassword(dto.email);
    return {
      ok: true,
      message:
        'Если пользователь с таким email существует, ему отправлено письмо со ссылкой для сброса пароля',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    this.logger.log(`[AuthController] Сброс пароля по токену`);
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true, message: 'Пароль успешно изменён' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.refresh_token;
    await this.auth.logout(refresh);
    this.clearCookieTokens(res);
    this.logger.log(`[AuthController] Выход выполнен`);
    return { ok: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutAll(user.id);
    this.clearCookieTokens(res);
    this.logger.log(
      `[AuthController] Выход со всех устройств для userId=${user.id}`,
    );
    return { ok: true };
  }

  // ===== OAUTH ЯНДЕКС =====

  // Инициация OAuth: редирект на Яндекс для авторизации
  @Public()
  @Get('yandex')
  @UseGuards(AuthGuard('yandex')) // Активирует YandexStrategy, редирект на Яндекс
  async yandexLogin() {
    // Этот метод никогда не выполняется — AuthGuard сам делает редирект
  }

  // Callback от Яндекса: обмен code на token, создание сессии, редирект на фронт

  @Public()
  @Get('yandex/callback')
  @UseGuards(AuthGuard('yandex'))
  async yandexCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = req.user as YandexProfile;
    this.logger.log(`[AuthController] Yandex callback: yandexId=${profile.id}`);

    try {
      const tokens = await this.auth.yandexLogin(
        profile,
        this.extractMeta(req),
      );
      this.setCookieTokens(res, tokens, false);

      // Редиректим сразу в портфель — App.tsx синхронизирует сессию через checkAuth()
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      this.logger.log(
        `[AuthController] OAuth успешен, редирект на ${frontendUrl}/portfolio`,
      );
      return res.redirect(`${frontendUrl}/portfolio`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OAuth failed';
      this.logger.error(`[AuthController] Yandex OAuth error: ${msg}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  // Извлекаем метаданные запроса (IP, fingerprint) для аудита
  private extractMeta(req: Request) {
    return {
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ??
        req.ip ??
        '',
      fingerprint: req.headers['x-client-fingerprint'] as string | undefined,
    };
  }

  // Устанавливаем httpOnly куки с access и refresh токенами
  private setCookieTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };

    // Access token: короткий срок (15 минут)
    res.cookie('access_token', tokens.accessToken, {
      ...base,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    // Refresh token: 30 дней по умолчанию, 365 если rememberMe
    const refreshMaxAge = rememberMe
      ? 365 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: refreshMaxAge,
      path: '/auth/refresh',
    });

    this.logger.debug(
      `[AuthController] Cookies: access=15m, refresh=${rememberMe ? '365d' : '30d'}`,
    );
  }

  // Удаляем куки при выходе
  private clearCookieTokens(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }
}
