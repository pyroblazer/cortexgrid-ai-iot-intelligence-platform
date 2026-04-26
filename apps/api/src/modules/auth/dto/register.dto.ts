import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 8 chars, must contain uppercase, lowercase, number)',
    example: 'SecurePass123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one number',
  })
  password: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corp',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  organizationName: string;
}
