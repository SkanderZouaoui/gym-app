import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { CoachingService } from './coaching.service.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';
import { RequestSessionDto } from './dto/request-session.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('coaching')
@Controller('v1')
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Get('coaching/availability')
  getAvailabilityForMembers() {
    return this.coachingService.getCoachAvailabilityForMembers();
  }

  @Get('coaching/coaches/:id')
  getCoachProfile(@Param('id') id: string) {
    return this.coachingService.getCoachProfile(id);
  }

  @Roles(Role.COACH)
  @Post('coach/availability')
  setAvailability(@Body() dto: CreateAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.setAvailability(user.userId, dto);
  }

  @Roles(Role.COACH)
  @Get('coach/availability')
  getMyAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.getAvailability(user.userId);
  }

  @Roles(Role.COACH)
  @Get('coach/students')
  getStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.getStudents(user.userId);
  }

  @Roles(Role.COACH)
  @Delete('coach/availability/:id')
  removeAvailability(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.removeAvailability(id, user.userId);
  }

  @Post('coaching-sessions')
  requestSession(@Body() dto: RequestSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.requestSession(user.userId, dto);
  }

  @Get('me/coaching-sessions')
  getMySessions(@CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.getForMember(user.userId);
  }

  @Delete('coaching-sessions/:id')
  cancelByMember(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.cancelByMember(id, user.userId);
  }

  @Roles(Role.COACH)
  @Get('coach/coaching-sessions')
  getForCoach(@CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.getForCoach(user.userId);
  }

  @Roles(Role.COACH)
  @Get('coach/coaching-sessions/pending')
  getPending(@CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.getPendingRequests(user.userId);
  }

  @Roles(Role.COACH)
  @Patch('coach/coaching-sessions/:id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.confirmSession(id, user.userId);
  }

  @Roles(Role.COACH)
  @Patch('coach/coaching-sessions/:id/decline')
  decline(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coachingService.declineSession(id, user.userId);
  }
}
