import { IsEmail, IsOptional, IsString } from 'class-validator';
import { IsCompliantPassword } from '../../common/validators/password-policy.js';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsCompliantPassword()
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
