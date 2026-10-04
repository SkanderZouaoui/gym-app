import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { UsersService } from './users.service.js';
import { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
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
