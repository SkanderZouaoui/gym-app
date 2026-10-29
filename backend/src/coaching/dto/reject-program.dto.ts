import { IsOptional, IsString } from 'class-validator';

export class RejectProgramDto {
  /** Motif du refus, affiché au coach. */
  @IsOptional()
  @IsString()
  note?: string;
}
