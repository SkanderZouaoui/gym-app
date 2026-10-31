import { IsString, MaxLength } from 'class-validator';

export class GalleryKeyDto {
  @IsString()
  @MaxLength(300)
  key!: string;
}
