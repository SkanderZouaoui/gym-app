import { PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CreateCoachDto } from './create-coach.dto.js';

export class UpdateCoachDto extends PartialType(OmitType(CreateCoachDto, ['password'] as const)) {}
