import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UpdatePreferencesDto } from './dto/preferences.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findAll(
    userId: string,
    organizationId: string,
    pagination: { page: number; pageSize: number },
  ) {
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.notification.count({
        where: { userId, organizationId },
      }),
    ]);

    return {
      success: true,
      data: notifications,
      meta: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
        hasMore: skip + pagination.pageSize < total,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationIds: string[], userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId, isRead: false },
      data: { isRead: true },
    });
  }

  async getPreferences(userId: string) {
    // Try Redis cache first
    const cached = await this.redisService.get(`notification_prefs:${userId}`);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    // Return default preferences if none stored
    // In a full implementation this would query a NotificationPreference table
    const defaultPreferences = {
      email: true,
      push: true,
      alertCritical: true,
      alertWarning: true,
      alertInfo: true,
      billing: true,
      system: true,
      deviceOffline: true,
      deviceOnline: false,
      weeklyReport: true,
    };

    return { success: true, data: defaultPreferences };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const preferences = {
      email: dto.preferences?.email ?? true,
      push: dto.preferences?.push ?? true,
      alertCritical: dto.preferences?.alertCritical ?? true,
      alertWarning: dto.preferences?.alertWarning ?? true,
      alertInfo: dto.preferences?.alertInfo ?? true,
      billing: dto.preferences?.billing ?? true,
      system: dto.preferences?.system ?? true,
      deviceOffline: dto.preferences?.deviceOffline ?? true,
      deviceOnline: dto.preferences?.deviceOnline ?? false,
      weeklyReport: dto.preferences?.weeklyReport ?? true,
    };

    // Cache preferences in Redis (30 day TTL)
    await this.redisService.set(
      `notification_prefs:${userId}`,
      JSON.stringify(preferences),
      30 * 24 * 60 * 60,
    );

    this.logger.log(`Notification preferences updated for user ${userId}`);

    return { success: true, data: preferences };
  }

  /**
   * Create a notification - internal method used by other modules
   */
  async createNotification(params: {
    userId: string;
    organizationId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        type: params.type as any,
        title: params.title,
        message: params.message,
        metadata: (params.metadata || {}) as any,
      },
    });

    // Publish to Redis for real-time delivery
    await this.redisService.publish(
      `notifications:${params.userId}`,
      JSON.stringify({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt.toISOString(),
      }),
    );

    this.logger.debug(`Notification created: ${notification.id} for user ${params.userId}`);

    return notification;
  }

  async deleteOne(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only delete your own notifications');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { message: 'Notification deleted' };
  }
}
