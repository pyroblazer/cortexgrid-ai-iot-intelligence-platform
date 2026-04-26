import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({ description: 'Notification IDs to mark as read', type: [String] })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}
