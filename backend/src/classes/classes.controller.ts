import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ClassesService } from './classes.service.js';
import { CreateClassTypeDto } from './dto/create-class-type.dto.js';
import { UpdateClassTypeDto } from './dto/update-class-type.dto.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { GenerateSessionsDto } from './dto/generate-sessions.dto.js';
import { CancelSessionDto } from './dto/cancel-session.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('classes')
@Controller('v1')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('class-types')
  findAllTypes() {
    return this.classesService.findAllTypes();
  }

  @Roles(Role.ADMIN)
  @Get('admin/class-types')
  findAllTypesForAdmin() {
    return this.classesService.findAllTypes(true);
  }

  @Roles(Role.ADMIN)
  @Post('admin/class-types')
  createType(@Body() dto: CreateClassTypeDto) {
    return this.classesService.createType(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/class-types/:id')
  updateType(@Param('id') id: string, @Body() dto: UpdateClassTypeDto) {
    return this.classesService.updateType(id, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin/class-types/:id/gallery/upload-url')
  galleryUploadUrl(@Param('id') id: string, @Body() body: { contentType: string }) {
    return this.classesService.galleryUploadUrl(id, body.contentType);
  }

  @Roles(Role.ADMIN)
  @Post('admin/class-types/:id/gallery')
  addGalleryImage(@Param('id') id: string, @Body() body: { key: string }) {
    return this.classesService.addGalleryImage(id, body.key);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/class-types/:id/gallery')
  removeGalleryImage(@Param('id') id: string, @Body() body: { key: string }) {
    return this.classesService.removeGalleryImage(id, body.key);
  }

  @Roles(Role.ADMIN)
  @Get('admin/class-templates')
  findTemplates() {
    return this.classesService.findAllTemplates();
  }

  @Roles(Role.ADMIN)
  @Post('admin/class-templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.classesService.createTemplate(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/class-templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.classesService.updateTemplate(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/class-templates/:id/deactivate')
  deactivateTemplate(@Param('id') id: string) {
    return this.classesService.deactivateTemplate(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/class-templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.classesService.deleteTemplate(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/class-templates/:id/generate-sessions')
  generateSessions(@Param('id') id: string, @Body() dto: GenerateSessionsDto) {
    return this.classesService.generateSessions(id, dto);
  }

  @Get('classes/sessions')
  findSessions(@Query('from') from?: string, @Query('to') to?: string) {
    return this.classesService.findSessions(from, to);
  }

  @Get('classes/sessions/:id')
  findSession(@Param('id') id: string) {
    return this.classesService.findSessionDetail(id);
  }

  @Roles(Role.COACH)
  @Get('coach/sessions')
  findMySessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.classesService.findSessionsForCoach(user.userId, from, to);
  }

  @Roles(Role.ADMIN)
  @Post('admin/sessions/:id/cancel')
  cancelSession(
    @Param('id') id: string,
    @Body() dto: CancelSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classesService.cancelSession(id, dto.reason, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/sessions/:id/capacity')
  updateCapacity(
    @Param('id') id: string,
    @Body('capacity') capacity: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classesService.updateCapacity(id, capacity, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/sessions/:id/coach')
  replaceCoach(
    @Param('id') id: string,
    @Body('coachId') coachId: string | null,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classesService.replaceCoach(id, coachId, user.userId);
  }
}
