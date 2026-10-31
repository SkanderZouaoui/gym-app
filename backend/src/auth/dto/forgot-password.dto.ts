import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  /** Langue de l'app, pour traduire l'e-mail. */
  @IsOptional()
  @IsIn(['fr', 'en', 'ar'])
  lang?: string;
}
