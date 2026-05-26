// back/src/modules/auth/auth.controller.ts

import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto, this.extractMeta(req));
    this.setCookieTokens(res, tokens);
    return { user: { email: dto.email, displayName: dto.displayName } };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto, this.extractMeta(req));
    this.setCookieTokens(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefresh = req.cookies?.refresh_token;
    if (!oldRefresh)
      throw new UnauthorizedException('Refresh token отсутствует');
    const tokens = await this.auth.refresh(oldRefresh, this.extractMeta(req));
    this.setCookieTokens(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.refresh_token;
    await this.auth.logout(refresh);
    this.clearCookieTokens(res);
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
    return { ok: true };
  }

  // Извлекает метаданные запроса для защиты от кражи токенов
  private extractMeta(req: Request) {
    return {
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ??
        req.ip ??
        '',
      fingerprint: req.headers['x-client-fingerprint'] as string | undefined,
    };
  }

  // Кладём access и refresh в httpOnly cookies
  private setCookieTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };
    res.cookie('access_token', tokens.accessToken, {
      ...base,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
  }

  // Очищает обе cookie при выходе
  private clearCookieTokens(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }
}
