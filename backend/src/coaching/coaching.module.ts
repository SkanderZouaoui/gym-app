import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service.js';
import { ExercisesController } from './exercises.controller.js';
import { ProgramsService } from './programs.service.js';
import { ProgramsController } from './programs.controller.js';
import { WorkoutsService } from './workouts.service.js';
import { WorkoutsController } from './workouts.controller.js';

@Module({
  controllers: [ExercisesController, ProgramsController, WorkoutsController],
  providers: [ExercisesService, ProgramsService, WorkoutsService],
  exports: [ExercisesService, ProgramsService, WorkoutsService],
})
export class CoachingModule {}
