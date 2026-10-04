import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { CreateBookingOnBehalfDto } from './dto/create-booking-on-behalf.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('bookings')
@Controller('v1')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('me/bookings')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findForUser(user.userId);
  }

  @Post('bookings')
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.create(user.userId, dto.sessionId);
  }

  @Delete('bookings/:id')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.cancel(user.userId, id);
  }

  /** Inscrire un adhérent au nom de celui-ci (section 4.2/4.3). */
  @Roles(Role.STAFF, Role.ADMIN, Role.COACH)
  @Post('bookings/on-behalf')
  createOnBehalf(@Body() dto: CreateBookingOnBehalfDto) {
    return this.bookingsService.createOnBehalf(dto.userId, dto.sessionId);
  }
}
