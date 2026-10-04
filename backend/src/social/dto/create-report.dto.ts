import { IsIn, IsString } from 'class-validator';

export class CreateReportDto {
  @IsIn(['POST', 'COMMENT', 'USER'])
  targetType!: 'POST' | 'COMMENT' | 'USER';

  @IsString()
  targetId!: string;

  @IsString()
  reason!: string;
}
