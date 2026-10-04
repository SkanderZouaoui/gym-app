import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';

class NoShowPenaltyDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(1)
  threshold!: number;

  @IsInt()
  @Min(1)
  windowDays!: number;

  @IsInt()
  @Min(1)
  blockBookingDays!: number;
}

export class UpdateAttendancePolicyDto {
  @IsInt()
  @Min(0)
  scanOpensMinutesBefore!: number;

  @IsInt()
  @Min(0)
  scanClosesMinutesAfterStart!: number;

  @IsBoolean()
  allowWalkIn!: boolean;

  @IsInt()
  @Min(0)
  noShowGraceMinutes!: number;

  @ValidateNested()
  @Type(() => NoShowPenaltyDto)
  noShowPenalty!: NoShowPenaltyDto;

  @IsBoolean()
  staffCanRecordPayments!: boolean;
}
