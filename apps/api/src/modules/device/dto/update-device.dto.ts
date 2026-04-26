import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ description: 'Device name', example: 'Updated Sensor Name' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Device profile' })
  @IsObject()
  @IsOptional()
  profile?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Device metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Firmware version' })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @ApiPropertyOptional({ description: 'Physical location' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether the device is active' })
  @IsOptional()
  isActive?: boolean;
}
