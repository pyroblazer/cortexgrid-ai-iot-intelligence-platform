import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client initialized');
    }

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ||
      'CortexGrid <onboarding@resend.dev>';
  }

  isConfigured(): boolean {
    return !!this.resend;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not configured — skipping email send. ' +
          'Set RESEND_API_KEY to enable email delivery.',
      );
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Resend API error for "${to}" — ${error.message}`,
        );
        throw new Error(`Resend API error: ${error.message}`);
      }

      this.logger.log(
        `Email sent to "${to}" — subject="${subject}" — id=${data?.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send email to "${to}" — subject="${subject}"`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
