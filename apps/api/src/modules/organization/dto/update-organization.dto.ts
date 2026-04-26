import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name', example: 'Acme Corp Updated' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Organization logo URL' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Organization settings as JSON',
    example: { timezone: 'UTC', telemetryRetentionDays: 90 },
  })
  @IsOptional()
  settings?: Record<string, any>;
}
