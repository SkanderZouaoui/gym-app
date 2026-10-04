import { IsString } from 'class-validator';

export class WalkInDto {
  @IsString()
  sessionId!: string;

  @IsString()
  userId!: string;
}
