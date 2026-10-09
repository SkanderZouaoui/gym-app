import { IsEmail, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;

  @IsString()
  password!: string;
}
