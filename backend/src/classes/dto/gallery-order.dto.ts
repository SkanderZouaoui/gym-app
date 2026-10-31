import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/** Nouvel ordre d'une galerie : doit contenir exactement les mêmes clés que la galerie actuelle. */
export class GalleryOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  keys!: string[];
}
