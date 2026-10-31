import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service.js';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('workouts')
@Controller('v1')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get('me/workouts')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.workoutsService.findForUser(user.userId);
  }

  @Post('me/workouts')
  create(@Body() dto: CreateWorkoutLogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workoutsService.create(user.userId, dto);
  }
}
