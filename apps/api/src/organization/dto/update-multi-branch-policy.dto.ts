import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

class CrossBranchBookingDto {
  @IsIn(['DISABLED', 'ENABLED', 'LIMITED'])
  mode!: 'DISABLED' | 'ENABLED' | 'LIMITED';

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyQuota!: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  bookingWindowHours!: number | null;
}

export class UpdateMultiBranchPolicyDto {
  @IsIn(['HOME_ONLY', 'ALL', 'SELECTED'])
  defaultAccessScope!: 'HOME_ONLY' | 'ALL' | 'SELECTED';

  @ValidateNested()
  @Type(() => CrossBranchBookingDto)
  crossBranchBooking!: CrossBranchBookingDto;
}
