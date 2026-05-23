import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../../email/email.service';

@Processor('notification-delivery')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<{
    userId: string;
    organizationId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    const { userId, organizationId, type, title, message, metadata } = job.data;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`User ${userId} not found or inactive, skipping notification`);
        return;
      }

      // Persist the notification in the database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          organizationId,
          type: type as any,
          title,
          message,
          metadata: (metadata || {}) as any,
        },
      });

      // Publish to Redis for real-time WebSocket delivery
      await this.redisService.publish(
        `notifications:${userId}`,
        JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt.toISOString(),
        }),
      );

      this.logger.debug(`In-app notification created: ${notification.id} for user ${userId}`);

      // Send email for high-priority notification types
      if (this.shouldSendEmail(type)) {
        await this.sendEmailNotification(user, title, message);
      }
    } catch (error) {
      this.logger.error(`Failed to deliver notification to user ${userId}: ${(error as Error).message}`);
    }
  }

  private shouldSendEmail(type: string): boolean {
    return ['BILLING', 'SYSTEM', 'ALERT'].includes(type.toUpperCase());
  }

  private async sendEmailNotification(
    user: { email: string; firstName: string | null },
    title: string,
    message: string,
  ): Promise<void> {
    if (!this.emailService.isConfigured()) return;

    const userName = user.firstName || 'there';

    await this.emailService.send(
      user.email,
      title,
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">${title}</h2>
        <p>Hi ${userName},</p>
        <p>${message}</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">CortexGrid IoT Platform — This is an automated notification.</p>
      </div>`,
    ).catch((err) => {
      this.logger.error(`Failed to send notification email to ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
