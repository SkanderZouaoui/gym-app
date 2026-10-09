import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { UsersService } from './users.service.js';
import { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { RequestUploadUrlDto } from '../storage/dto/request-upload-url.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

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

  @Post('me/avatar-upload-url')
  requestAvatarUploadUrl(@Body() dto: RequestUploadUrlDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.requestAvatarUploadUrl(user.userId, dto.contentType);
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
  search(@Query('search') search: string, @Query('branchId') branchId?: string) {
    return this.usersService.search(search ?? '', branchId);
  }

  @Roles(Role.STAFF, Role.COACH, Role.ADMIN)
  @Get('members/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
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
  @Post('admin/users')
  createPrivilegedUser(@Body() dto: CreatePrivilegedUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.createPrivilegedUser(dto, user.userId);
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
}
