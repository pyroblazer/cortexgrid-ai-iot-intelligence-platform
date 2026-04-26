import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeRangeDto {
  @ApiPropertyOptional({
    description: 'Start time (ISO 8601)',
    example: '2024-01-15T00:00:00Z',
  })
  @IsString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    description: 'End time (ISO 8601)',
    example: '2024-01-15T23:59:59Z',
  })
  @IsString()
  @IsOptional()
  end?: string;
}

export class AiQueryDto {
  @ApiProperty({
    description: 'Natural language query about telemetry data',
    example: 'What was the average temperature across all devices yesterday?',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Filter to specific device IDs',
    example: ['device-uuid-1', 'device-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Time range to consider',
    type: TimeRangeDto,
  })
  @IsObject()
  @IsOptional()
  timeRange?: TimeRangeDto;
}
