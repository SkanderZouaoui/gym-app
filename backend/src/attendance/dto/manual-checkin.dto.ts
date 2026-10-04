import { IsOptional, IsString } from 'class-validator';

export class ManualCheckinDto {
  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /** Repli : code de réservation à 6 caractères (section 6.5). */
  @IsOptional()
  @IsString()
  bookingCode?: string;
}
