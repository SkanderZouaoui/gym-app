import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ExercisesService } from './exercises.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

/** Un query param répété (`?muscleGroup=a&muscleGroup=b`) arrive en tableau,
 * une seule occurrence en string — on normalise toujours en tableau. */
function toArray(value?: string | string[]): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

@ApiTags('exercises')
@Controller('v1/exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('muscleGroup') muscleGroup?: string | string[],
    @Query('equipment') equipment?: string | string[],
  ) {
    return this.exercisesService.findAll({
      search,
      muscleGroup: toArray(muscleGroup),
      equipment: toArray(equipment),
    });
  }

  @Get('muscle-groups')
  findMuscleGroups() {
    return this.exercisesService.findMuscleGroups();
  }

  @Get('equipment')
  findEquipment() {
    return this.exercisesService.findEquipment();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
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
