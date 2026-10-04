import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';

class OfflineScanEntryDto {
  @IsString()
  sessionId!: string;

  @IsString()
  userId!: string;

  @IsISO8601()
  scannedAt!: string;

  @IsOptional()
  @IsString()
  jti?: string;
}

export class SyncDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => OfflineScanEntryDto)
  scans!: OfflineScanEntryDto[];
}
