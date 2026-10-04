import { Module } from '@nestjs/common';
import { CoachingService } from './coaching.service.js';
import { CoachingController } from './coaching.controller.js';
import { ExercisesService } from './exercises.service.js';
import { ExercisesController } from './exercises.controller.js';
import { ProgramsService } from './programs.service.js';
import { ProgramsController } from './programs.controller.js';
import { WorkoutsService } from './workouts.service.js';
import { WorkoutsController } from './workouts.controller.js';

@Module({
  controllers: [CoachingController, ExercisesController, ProgramsController, WorkoutsController],
  providers: [CoachingService, ExercisesService, ProgramsService, WorkoutsService],
  exports: [CoachingService, ExercisesService, ProgramsService, WorkoutsService],
})
export class CoachingModule {}
