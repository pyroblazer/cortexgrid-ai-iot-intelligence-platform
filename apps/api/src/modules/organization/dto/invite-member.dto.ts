import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address to invite', example: 'newuser@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Role to assign',
    enum: MembershipRole,
    example: MembershipRole.MEMBER,
  })
  @IsEnum(MembershipRole)
  @IsNotEmpty()
  role: MembershipRole;
}
