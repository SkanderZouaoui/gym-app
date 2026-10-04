import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
