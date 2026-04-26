import {
  IsArray,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelemetrySummaryDto {
  @ApiProperty({
    description: 'Array of device IDs to include in the summary',
    example: ['device-uuid-1', 'device-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiPropertyOptional({
    description: 'Time range for summary data',
    type: Object,
    example: { start: '2024-01-15T00:00:00Z', end: '2024-01-15T23:59:59Z' },
  })
  @IsObject()
  @IsOptional()
  timeRange?: { start?: string; end?: string };
}
