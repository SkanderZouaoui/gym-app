import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { StaffService } from './staff.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BranchScope } from '../auth/decorators/branch-scope.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('staff')
@Controller('v1')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Roles(Role.STAFF, Role.ADMIN, Role.COACH)
  @BranchScope({ source: 'query', field: 'branchId' })
  @Get('staff/today')
  today(@Query('branchId') branchId: string) {
    return this.staffService.today(branchId);
  }

  @Roles(Role.STAFF, Role.ADMIN, Role.COACH)
  @Get('members/:id/notes')
  getNotes(@Param('id') id: string) {
    return this.staffService.getMemberNotes(id);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Post('members/:id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.staffService.addMemberNote(id, dto.body, user.userId);
  }
}
