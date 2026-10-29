import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { Role } from '@muscleup/shared';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { NotificationCampaignsService, type RuleCondition } from './notification-campaigns.service.js';

class CreateCampaignDto {
  @IsIn(['Annonce', 'Rappel', 'Offre'])
  kind!: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) body!: string;
  @IsString() audience!: string;
  @IsOptional() @IsISO8601() sendAt?: string;
}

class CreateRuleDto {
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) body!: string;
  @IsString() audience!: string;
  @IsIn(['NONE', 'EXPIRES_7D', 'ABSENT_14D', 'CLASS_TOMORROW']) condition!: RuleCondition;
  @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) days!: number[];
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) time!: string;
}

class ToggleRuleDto {
  @IsBoolean() isActive!: boolean;
}

@Controller('v1/admin/notifications')
@Roles(Role.ADMIN)
export class NotificationCampaignsController {
  constructor(private readonly service: NotificationCampaignsService) {}

  @Get('audiences')
  async audiences() {
    return { audiences: await this.service.audiences(), conditions: await this.service.conditionCounts() };
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId);
  }

  @Get('scheduled')
  scheduled() {
    return this.service.listScheduled();
  }

  @Get('history')
  history() {
    return this.service.history();
  }

  @Delete('scheduled/:id')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Get('rules')
  rules() {
    return this.service.listRules();
  }

  @Post('rules')
  createRule(@Body() dto: CreateRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRule(dto, user.userId);
  }

  @Patch('rules/:id')
  toggleRule(@Param('id') id: string, @Body() dto: ToggleRuleDto) {
    return this.service.toggleRule(id, dto.isActive);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.service.deleteRule(id);
  }
}
