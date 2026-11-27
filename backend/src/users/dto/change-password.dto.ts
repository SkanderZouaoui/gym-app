import { IsString } from 'class-validator';
import { IsCompliantPassword } from '../../common/validators/password-policy.js';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsCompliantPassword()
  newPassword!: string;
}
