import { IsString, IsNotEmpty, IsObject, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestTelemetryDto {
  @ApiProperty({ description: 'Device ID', example: 'clxabc123' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Telemetry metrics as key-value pairs',
    example: { value: 23.5, unit: 'celsius', batteryLevel: 95 },
  })
  @IsObject()
  @IsNotEmpty()
  metrics: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Timestamp (defaults to server time)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

export class QueryTelemetryDto {
  @ApiPropertyOptional({ description: 'Start time (ISO 8601)', example: '2024-01-15T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)', example: '2024-01-15T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Aggregation interval', enum: ['1m', '5m', '15m', '1h', '1d'], example: '1h' })
  @IsString()
  @IsOptional()
  interval?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', example: 50 })
  @IsOptional()
  limit?: string;
}
