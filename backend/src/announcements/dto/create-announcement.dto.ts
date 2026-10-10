import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsIn(['info', 'accent', 'danger'])
  tone?: 'info' | 'accent' | 'danger';
}
