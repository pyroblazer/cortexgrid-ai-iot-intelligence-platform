import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: MembershipRole,
    example: MembershipRole.ADMIN,
  })
  @IsEnum(MembershipRole)
  @IsNotEmpty()
  role: MembershipRole;
}
