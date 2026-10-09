import { IsInt, Min } from 'class-validator';

export class ExtendMembershipDto {
  @IsInt()
  @Min(1)
  days!: number;
}
