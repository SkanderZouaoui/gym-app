import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { AnnouncementsService } from './announcements.service.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('announcements')
@Controller('v1/admin/announcements')
@Roles(Role.ADMIN)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  findAll() {
    return this.announcementsService.findAll();
  }

  @Post('preview')
  preview(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.previewRecipients(dto);
  }

  @Post()
  send(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.send(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.remove(id, user.userId);
  }
}
