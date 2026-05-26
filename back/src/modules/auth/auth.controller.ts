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
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { id: string; email: string }) {
    this.logger.log(
      `[Auth:Me] Запрос профиля: userId=${user.id}, email=${user.email}`,
    );
    return { id: user.id, email: user.email };
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`[AuthController] Начало регистрации: ${dto.email}`);
    const tokens = await this.auth.register(dto, this.extractMeta(req));
    this.setCookieTokens(res, tokens, false); // при регистрации rememberMe = false
    this.logger.log(
      `[AuthController] Куки установлены для регистрации: ${dto.email}`,
    );
    return { user: { email: dto.email, displayName: dto.displayName } };
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

    // При refresh сохраняем rememberMe из оригинальной сессии
    // Определяем по expiresAt: если > 60 дней — rememberMe был true
    const daysUntilExpiry =
      (tokens.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    const rememberMe = daysUntilExpiry > 60;
    this.setCookieTokens(res, tokens, rememberMe);

    this.logger.log(
      `[AuthController] Новые куки установлены при рефреше, rememberMe=${rememberMe}`,
    );
    return { ok: true };
  }

  // Forgot password: всегда возвращаем 200, даже если email не найден
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`[AuthController] Запрос сброса пароля для: ${dto.email}`);
    await this.auth.forgotPassword(dto.email);
    // Единый ответ для защиты от enumeration
    return {
      ok: true,
      message:
        'Если пользователь с таким email существует, ему отправлено письмо со ссылкой для сброса пароля',
    };
  }

  // Reset password: принимает токен из URL и новый пароль
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

  private extractMeta(req: Request) {
    return {
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ??
        req.ip ??
        '',
      fingerprint: req.headers['x-client-fingerprint'] as string | undefined,
    };
  }

  // Установка кук с учётом rememberMe
  private setCookieTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };

    // Access token всегда 15 минут
    res.cookie('access_token', tokens.accessToken, {
      ...base,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    // Refresh token: 30 дней по умолчанию, 365 дней если rememberMe
    const refreshMaxAge = rememberMe
      ? 365 * 24 * 60 * 60 * 1000 // 365 дней
      : 30 * 24 * 60 * 60 * 1000; // 30 дней

    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: refreshMaxAge,
      path: '/auth/refresh',
    });

    this.logger.debug(
      `[AuthController] Cookies: access=15m, refresh=${rememberMe ? '365d' : '30d'}`,
    );
  }

  private clearCookieTokens(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }
}
