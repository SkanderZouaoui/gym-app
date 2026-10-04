import { IsString } from 'class-validator';

export class StartConversationDto {
  @IsString()
  otherUserId!: string;
}
