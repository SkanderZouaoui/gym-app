import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BadgesService } from './badges.service.js';
import { CreateBadgeDto, ReorderBadgesDto, UpdateBadgeDto } from './dto/badge.dto.js';

@ApiTags('badges')
@Controller('v1')
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  /** Badges actifs du profil adhérent. */
  @Get('badges')
  active() {
    return this.badges.listActive();
  }

  @Roles(Role.ADMIN)
  @Get('admin/badges')
  all() {
    return this.badges.listAll();
  }

  @Roles(Role.ADMIN)
  @Post('admin/badges')
  create(@Body() dto: CreateBadgeDto) {
    return this.badges.create(dto);
  }

  @Roles(Role.ADMIN)
  @Put('admin/badges/order')
  reorder(@Body() dto: ReorderBadgesDto) {
    return this.badges.reorder(dto.ids);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/badges/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    return this.badges.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/badges/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.badges.remove(id);
  }
}
