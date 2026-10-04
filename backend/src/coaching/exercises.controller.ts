import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ExercisesService } from './exercises.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('exercises')
@Controller('v1/exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll() {
    return this.exercisesService.findAll();
  }

  @Roles(Role.COACH, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.create(dto, user.userId);
  }

  @Roles(Role.COACH, Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.exercisesService.deactivate(id);
  }
}
