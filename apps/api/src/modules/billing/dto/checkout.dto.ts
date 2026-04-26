import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '@prisma/client';

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Plan to subscribe to',
    enum: PlanType,
    example: PlanType.PRO,
  })
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;

  @ApiPropertyOptional({
    description: 'Success URL after checkout',
    example: 'http://localhost:3000/billing/success',
  })
  @IsString()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel URL if checkout is cancelled',
    example: 'http://localhost:3000/billing/cancel',
  })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

export class CreatePortalDto {
  @ApiPropertyOptional({
    description: 'Return URL after portal session',
    example: 'http://localhost:3000/billing',
  })
  @IsString()
  @IsOptional()
  returnUrl?: string;
}
