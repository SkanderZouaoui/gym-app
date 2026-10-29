import { IsISO8601, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() @MinLength(1) body?: string;

  /** AAAA-MM-JJ, ou null pour retirer la limite. */
  @ValidateIf((o: UpdateAnnouncementDto) => o.startsOn !== null && o.startsOn !== undefined)
  @IsISO8601()
  startsOn?: string | null;

  @ValidateIf((o: UpdateAnnouncementDto) => o.endsOn !== null && o.endsOn !== undefined)
  @IsISO8601()
  endsOn?: string | null;
}
