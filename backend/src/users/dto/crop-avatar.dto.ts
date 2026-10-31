import { IsNumber, Max, Min } from 'class-validator';

/** Zone à conserver, en fractions (0–1) de la largeur / hauteur de la photo actuelle. */
export class CropAvatarDto {
  @IsNumber() @Min(0) @Max(1)
  left!: number;

  @IsNumber() @Min(0) @Max(1)
  top!: number;

  @IsNumber() @Min(0.01) @Max(1)
  width!: number;

  @IsNumber() @Min(0.01) @Max(1)
  height!: number;
}
