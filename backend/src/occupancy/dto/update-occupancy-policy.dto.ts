import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateOccupancyPolicyDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  wifiWeight!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  otherNetworkWeight!: number;

  @IsInt()
  @Min(5)
  @Max(240)
  presenceWindowMinutes!: number;

  @IsInt()
  @Min(5)
  @Max(720)
  manualOverrideDefaultDurationMinutes!: number;

  @IsInt()
  @Min(15)
  @Max(1440)
  manualOverrideMaxDurationMinutes!: number;

  @IsBoolean()
  visibleToMembers!: boolean;

  /** IP(s) publique(s) de la salle, séparées par des virgules ; null ou vide = non configurée. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  publicIp?: string | null;
}
