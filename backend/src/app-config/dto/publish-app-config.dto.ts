import { IsOptional, IsString } from 'class-validator';

export class PublishAppConfigDto {
  @IsOptional()
  @IsString()
  note?: string;
}
