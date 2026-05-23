import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCommandDto {
  @ApiProperty({ example: 'set_threshold' })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
