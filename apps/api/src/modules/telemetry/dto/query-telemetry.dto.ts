import {
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum AggregationType {
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count',
}

export class QueryTelemetryDto {
  @ApiPropertyOptional({
    description: 'Start time (ISO 8601 date string)',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    description: 'End time (ISO 8601 date string)',
    example: '2024-01-15T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  end?: string;

  @ApiPropertyOptional({
    description: 'Specific metric keys to filter',
    example: ['temperature', 'humidity'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Aggregation function',
    enum: AggregationType,
    example: AggregationType.AVG,
  })
  @IsEnum(AggregationType)
  @IsOptional()
  aggregation?: AggregationType;

  @ApiPropertyOptional({
    description: 'Aggregation interval (e.g. 1m, 5m, 15m, 1h, 1d)',
    example: '1h',
  })
  @IsString()
  @IsOptional()
  interval?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 50;
}
