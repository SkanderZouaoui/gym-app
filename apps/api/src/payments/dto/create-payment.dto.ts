import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  membershipId!: string;

  @IsString()
  branchId!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsIn(['CASH', 'TRANSFER', 'CHECK', 'OTHER'])
  method!: 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';

  @IsOptional()
  @IsString()
  reference?: string;
}
