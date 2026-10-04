import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ProgramsService } from './programs.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('programs')
@Controller('v1')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get('me/programs')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.programsService.findForMember(user.userId);
  }

  @Roles(Role.COACH)
  @Post('coach/programs')
  create(@Body() dto: CreateProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.programsService.create(dto, user.userId);
  }

  @Roles(Role.COACH)
  @Get('coach/programs')
  findMyCreated(@CurrentUser() user: AuthenticatedUser) {
    return this.programsService.findCreatedByCoach(user.userId);
  }

  @Get('programs/:id')
  findOne(@Param('id') id: string) {
    return this.programsService.findOne(id);
  }

  @Roles(Role.COACH)
  @Delete('coach/programs/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programsService.remove(id, user.userId);
  }
}
