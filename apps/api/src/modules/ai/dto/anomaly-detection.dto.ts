import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnomalyDetectionDto {
  @ApiProperty({
    description: 'Device ID to analyze',
    example: 'clxabc123',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Metric name to detect anomalies for',
    example: 'temperature',
  })
  @IsString()
  @IsNotEmpty()
  metric: string;

  @ApiPropertyOptional({
    description: 'Time range for analysis',
    type: Object,
    example: { start: '2024-01-15T00:00:00Z', end: '2024-01-15T23:59:59Z' },
  })
  @IsObject()
  @IsOptional()
  timeRange?: { start?: string; end?: string };

  @ApiPropertyOptional({
    description: 'Sensitivity multiplier for standard deviation threshold (higher = fewer anomalies)',
    example: 2.0,
    default: 2.0,
    minimum: 0.5,
    maximum: 10.0,
  })
  @IsNumber()
  @Min(0.5)
  @Max(10.0)
  @IsOptional()
  sensitivity?: number = 2.0;
}
