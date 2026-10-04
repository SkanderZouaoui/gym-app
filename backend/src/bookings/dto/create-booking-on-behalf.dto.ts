import { IsString } from 'class-validator';

export class CreateBookingOnBehalfDto {
  @IsString()
  userId!: string;

  @IsString()
  sessionId!: string;
}
