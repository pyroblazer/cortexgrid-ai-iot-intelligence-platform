import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  ALERT = 'ALERT',
  DEVICE = 'DEVICE',
  BILLING = 'BILLING',
  SYSTEM = 'SYSTEM',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
