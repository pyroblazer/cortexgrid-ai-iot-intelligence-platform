import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns true when SMTP_HOST is configured, indicating the service
   * is ready to send emails. When false, calls to `send` will be skipped
   * with a warning log (graceful degradation for local development).
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('SMTP_HOST');
  }

  /**
   * Lazily creates and returns the Nodemailer SMTP transporter.
   * Reuses the same instance across subsequent calls.
   */
  private ensureTransporter(): Transporter {
    if (!this.transporter) {
      const host = this.configService.get<string>('SMTP_HOST');
      const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASSWORD');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
      });

      this.logger.log(`SMTP transporter created (host=${host}, port=${port})`);
    }
    return this.transporter;
  }

  /**
   * Sends an HTML email. If SMTP is not configured, logs a warning and returns
   * without throwing, allowing the application to function normally in development.
   *
   * @param to      Recipient email address
   * @param subject Email subject line
   * @param html    HTML body content
   */
  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'SMTP not configured — skipping email send. ' +
          'Set SMTP_HOST and related env vars to enable email delivery.',
      );
      return;
    }

    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'noreply@cortexgrid.io';

    try {
      const transporter = this.ensureTransporter();
      const result = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(
        `Email sent to "${to}" — subject="${subject}" — messageId=${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to "${to}" — subject="${subject}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.transporter) {
      try {
        this.transporter.close();
        this.logger.log('SMTP transporter connection closed');
      } catch (error) {
        this.logger.error(
          'Error closing SMTP transporter',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
