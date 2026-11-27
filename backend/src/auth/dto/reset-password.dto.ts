import { IsEmail, IsString, Length } from 'class-validator';
import { IsCompliantPassword } from '../../common/validators/password-policy.js';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsCompliantPassword()
  newPassword!: string;
}
