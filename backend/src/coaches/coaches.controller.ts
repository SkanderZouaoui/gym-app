import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { CoachesService } from './coaches.service.js';
import { CreateCoachDto } from './dto/create-coach.dto.js';
import { UpdateCoachDto } from './dto/update-coach.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('coaches')
@Roles(Role.ADMIN)
@Controller('v1/admin/coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Get()
  findAll() {
    return this.coachesService.findAll();
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.coachesService.findOne(userId);
  }

  @Post()
  create(@Body() dto: CreateCoachDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coachesService.create(dto, user.userId);
  }

  @Patch(':userId')
  update(
    @Param('userId') userId: string,
    @Body() dto: UpdateCoachDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coachesService.update(userId, dto, user.userId);
  }
}
