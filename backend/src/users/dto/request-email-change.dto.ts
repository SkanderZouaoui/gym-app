import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;

  @IsString()
  password!: string;

  /** Langue de l'app, pour traduire l'e-mail. */
  @IsOptional()
  @IsIn(['fr', 'en', 'ar'])
  lang?: string;
}
