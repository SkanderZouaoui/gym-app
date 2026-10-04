import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { LoyaltyService } from './loyalty.service.js';
import { CreateChallengeDto } from './dto/create-challenge.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('loyalty')
@Controller('v1')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me/points')
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.getBalance(user.userId);
  }

  @Get('me/points/history')
  getHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.getHistory(user.userId);
  }

  @Get('me/streak')
  async getStreak(@CurrentUser() user: AuthenticatedUser) {
    return { streak: await this.loyaltyService.getCurrentStreak(user.userId) };
  }

  @Get('me/attendance-calendar')
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.loyaltyService.getAttendanceCalendar(user.userId, new Date(from), new Date(to));
  }

  @Get('challenges')
  findActive(@Query('branchId') branchId?: string) {
    return this.loyaltyService.findActiveChallenges(branchId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/challenges')
  create(@Body() dto: CreateChallengeDto) {
    return this.loyaltyService.createChallenge(dto);
  }

  @Post('challenges/:id/join')
  join(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.joinChallenge(id, user.userId);
  }

  @Get('challenges/:id/leaderboard')
  leaderboard(@Param('id') id: string) {
    return this.loyaltyService.getLeaderboard(id);
  }

  @Post('me/referral-code')
  getReferralCode(@CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.createReferralCode(user.userId);
  }
}
