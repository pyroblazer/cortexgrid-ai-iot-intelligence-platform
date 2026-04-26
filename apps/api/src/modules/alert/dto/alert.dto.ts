import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertSeverity } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Alert rule name', example: 'High Temperature Alert' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Alert rule description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Condition that triggers the alert',
    example: { field: 'metrics.value', operator: 'greaterThan', threshold: 25, durationSeconds: 300 },
  })
  @IsObject()
  @IsNotEmpty()
  condition: Record<string, any>;

  @ApiProperty({
    description: 'Alert severity level',
    enum: AlertSeverity,
    example: AlertSeverity.WARNING,
  })
  @IsEnum(AlertSeverity)
  @IsNotEmpty()
  severity: AlertSeverity;

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: 'Alert rule name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Alert rule description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Alert condition' })
  @IsObject()
  @IsOptional()
  condition?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Alert severity', enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ description: 'Acknowledge note' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
