import { PartialType } from '@nestjs/swagger';
import { CreateClassTypeDto } from './create-class-type.dto.js';

export class UpdateClassTypeDto extends PartialType(CreateClassTypeDto) {}
