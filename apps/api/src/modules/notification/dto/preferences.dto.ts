import {
  IsOptional,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable email notifications', example: true })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications', example: true })
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @ApiPropertyOptional({ description: 'Notify on critical alerts', example: true })
  @IsBoolean()
  @IsOptional()
  alertCritical?: boolean;

  @ApiPropertyOptional({ description: 'Notify on warning alerts', example: true })
  @IsBoolean()
  @IsOptional()
  alertWarning?: boolean;

  @ApiPropertyOptional({ description: 'Notify on info alerts', example: false })
  @IsBoolean()
  @IsOptional()
  alertInfo?: boolean;

  @ApiPropertyOptional({ description: 'Notify on billing events', example: true })
  @IsBoolean()
  @IsOptional()
  billing?: boolean;

  @ApiPropertyOptional({ description: 'Notify on system events', example: true })
  @IsBoolean()
  @IsOptional()
  system?: boolean;

  @ApiPropertyOptional({ description: 'Notify when devices go offline', example: true })
  @IsBoolean()
  @IsOptional()
  deviceOffline?: boolean;

  @ApiPropertyOptional({ description: 'Notify when devices come online', example: false })
  @IsBoolean()
  @IsOptional()
  deviceOnline?: boolean;

  @ApiPropertyOptional({ description: 'Receive weekly reports', example: true })
  @IsBoolean()
  @IsOptional()
  weeklyReport?: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Notification preferences object',
    example: {
      email: true,
      push: true,
      alertCritical: true,
      alertWarning: true,
      alertInfo: false,
      billing: true,
      system: true,
    },
  })
  @IsObject()
  @IsOptional()
  preferences?: NotificationPreferencesDto;
}
