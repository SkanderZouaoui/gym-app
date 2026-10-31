import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { UsersService } from './users.service.js';
import { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateWeeklyGoalDto } from './dto/complete-onboarding.dto.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { RequestUploadUrlDto } from '../storage/dto/request-upload-url.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { Throttle } from '@nestjs/throttler';
import { CropAvatarDto } from './dto/crop-avatar.dto.js';

@ApiTags('users')
@Controller('v1')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch('me/weekly-goal')
  updateWeeklyGoal(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateWeeklyGoalDto) {
    return this.usersService.updateWeeklyGoal(user.userId, dto.sessionsPerWeek);
  }

  @Post('me/onboarding')
  completeOnboarding(@CurrentUser() user: AuthenticatedUser, @Body() dto: CompleteOnboardingDto) {
    return this.usersService.completeOnboarding(user.userId, dto);
  }

  /** Recadre la photo de profil actuelle ; traitement d'image : limité à 10 appels par minute. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('me/avatar/crop')
  cropAvatar(@CurrentUser() user: AuthenticatedUser, @Body() dto: CropAvatarDto) {
    return this.usersService.cropAvatar(user.userId, dto);
  }

  @Post('me/avatar-upload-url')
  requestAvatarUploadUrl(@Body() dto: RequestUploadUrlDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.requestAvatarUploadUrl(user.userId, dto.contentType, dto.sizeBytes);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    await this.usersService.deleteOwnAccount(user.userId, dto.password);
  }

  @Post('me/change-password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Post('me/email/request-otp')
  @HttpCode(204)
  async requestEmailChange(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestEmailChangeDto) {
    await this.usersService.requestEmailChange(user.userId, dto);
  }

  @Post('me/email/confirm')
  confirmEmailChange(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmEmailChangeDto) {
    return this.usersService.confirmEmailChange(user.userId, dto.code);
  }

  @Roles(Role.STAFF, Role.COACH, Role.ADMIN)
  @Get('members')
  search(@Query('search') search: string) {
    return this.usersService.search(search ?? '');
  }

  @Roles(Role.STAFF, Role.COACH, Role.ADMIN)
  @Get('members/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneWithPhoto(id);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Post('members')
  createMember(@Body() dto: CreateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.createMember(dto, user.userId, user.activeRole);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('members/:id')
  updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateMember(id, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Delete('members/:id')
  @HttpCode(204)
  async deleteMember(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.usersService.deleteMember(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('members/:id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.suspend(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('members/:id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.reactivate(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('admin/team')
  findAllTeam() {
    return this.usersService.findAllTeam();
  }

  /** Nouveau mot de passe aléatoire pour un membre de l'équipe (admin). */
  @Roles(Role.ADMIN)
  @Post('admin/team/:id/reset-password')
  resetTeamPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.resetPassword(id, user.userId, user.roles);
  }

  /** Nouveau mot de passe aléatoire pour un adhérent (accueil ou admin). */
  @Roles(Role.STAFF, Role.ADMIN)
  @Post('members/:id/reset-password')
  resetMemberPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.resetPassword(id, user.userId, user.roles);
  }

  @Roles(Role.ADMIN)
  @Get('admin/team-on-shift')
  teamOnShift() {
    return this.usersService.teamOnShift();
  }

  @Roles(Role.ADMIN)
  @Get('admin/team/:id/schedule')
  teamSchedule(@Param('id') id: string) {
    return this.usersService.getSchedule(id);
  }

  @Roles(Role.ADMIN)
  @Put('admin/team/:id/schedule')
  setTeamSchedule(@Param('id') id: string, @Body() body: { days: { dayOfWeek: number; working: boolean; startTime: string; endTime: string }[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.setSchedule(id, Array.isArray(body?.days) ? body.days : [], user.userId);
  }

  /** Mon planning de travail (accueil, coach). */
  @Get('me/schedule')
  mySchedule(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getSchedule(user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('admin/team/:id/stats')
  teamStats(@Param('id') id: string, @Query('days') days?: string) {
    const n = Math.min(365, Math.max(1, Number(days) || 30));
    return this.usersService.getTeamStats(id, n);
  }

  @Roles(Role.ADMIN)
  @Post('admin/users')
  createPrivilegedUser(@Body() dto: CreatePrivilegedUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.createPrivilegedUser(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/team/:id')
  updateTeamMember(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateTeamMember(id, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/team/:id')
  @HttpCode(204)
  async deleteTeamMember(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.usersService.deleteMember(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/users/:id/roles')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignRole(id, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/users/:id/roles/:role')
  revokeRole(
    @Param('id') id: string,
    @Param('role') role: Role,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.revokeRole(id, role, user.userId);
  }
}
