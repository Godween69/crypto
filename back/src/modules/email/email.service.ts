// back/src/modules/email/email.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend!: Resend;
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM');

    if (!apiKey || !from) {
      this.logger.warn(
        '[Email] Resend не настроен. Письма будут только логироваться.',
      );
      return;
    }

    this.resend = new Resend(apiKey);
    this.isConfigured = true;

    try {
      // Тестовая отправка для проверки соединения
      await this.resend.domains.list();
      this.logger.log('[Email] Resend соединение проверено');
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(`[Email] Ошибка Resend: ${err.message}`);
      }
    }
  }

  // Отправка письма для сброса пароля
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const from = this.config.get<string>(
      'RESEND_FROM',
      'CryptoFolio <noreply@dvbstudio.online>',
    );

    const html = this.buildResetPasswordHtml(resetLink);

    await this.send({
      to: email,
      subject: 'Сброс пароля — CryptoFolio',
      html,
      from,
    });
  }

  // Базовый метод отправки через Resend HTTP API
  private async send(options: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }): Promise<void> {
    if (!this.isConfigured || !this.resend) {
      // Silent режим: логируем, но не шлём
      this.logger.log(
        `[Email] SILENT MODE. To: ${options.to}, Subject: ${options.subject}`,
      );
      this.logger.log(
        `[Email] HTML preview:\n${options.html.substring(0, 500)}...`,
      );
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(`[Email] Resend API error: ${JSON.stringify(error)}`);
        return;
      }

      this.logger.log(
        `[Email] Письмо отправлено через Resend: ${options.to}, id=${data?.id}`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(`[Email] Ошибка отправки: ${err.message}`);
      }
      // Не бросаем ошибку — отправка email не должна ломать основной flow
    }
  }

  // HTML-шаблон письма сброса пароля
  private buildResetPasswordHtml(resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#13131a;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#d4af37,#f4e5a1);border-radius:12px;line-height:48px;font-size:24px;font-weight:700;color:#0a0a0f;">₿</div>
              <h1 style="margin:20px 0 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;">CryptoFolio</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">Сброс пароля</h2>
              <p style="margin:0 0 16px;color:#9ca3af;font-size:15px;line-height:1.6;">
                Вы запросили сброс пароля для вашего аккаунта CryptoFolio.
                Нажмите на кнопку ниже, чтобы установить новый пароль.
              </p>
              <p style="margin:0 0 24px;color:#9ca3af;font-size:15px;line-height:1.6;">
                Ссылка действительна в течение <strong style="color:#fff;">1 часа</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}"
                   style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#d4af37,#e6c454);color:#0a0a0f;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
                  Сбросить пароль
                </a>
              </div>
              <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;line-height:1.5;">
                Если кнопка не работает, скопируйте ссылку в браузер:
              </p>
              <p style="margin:0;word-break:break-all;color:#d4af37;font-size:12px;line-height:1.5;">
                ${resetLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.5;">
                Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                Ваш пароль останется прежним.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px;">
                © ${new Date().getFullYear()} CryptoFolio. Все права защищены.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
