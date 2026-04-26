import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Device name', example: 'Temperature Sensor - Lab A' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Unique serial number', example: 'CG-TEMP-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serialNumber: string;

  @ApiProperty({ description: 'Device type', enum: DeviceType, example: DeviceType.SENSOR })
  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @ApiPropertyOptional({
    description: 'Device profile (manufacturer, model, protocol)',
    example: { manufacturer: 'CortexGrid', model: 'CG-T100', protocol: 'MQTT' },
  })
  @IsObject()
  @IsOptional()
  profile?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Device metadata',
    example: { unit: 'celsius', range: { min: -40, max: 125 } },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Firmware version', example: '2.1.3' })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @ApiPropertyOptional({ description: 'Physical location', example: 'Building A - Lab 1' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['temperature', 'lab-a', 'critical'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
