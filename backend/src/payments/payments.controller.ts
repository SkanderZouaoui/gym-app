import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('payments')
@Controller('v1')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(Role.STAFF, Role.ADMIN)
  @Post('payments')
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.create(dto, user.userId, user.activeRole);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Get('payments')
  findAll() {
    return this.paymentsService.findAll();
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Get('memberships/:membershipId/payments')
  findForMembership(@Param('membershipId') membershipId: string) {
    return this.paymentsService.findForMembership(membershipId);
  }
}
