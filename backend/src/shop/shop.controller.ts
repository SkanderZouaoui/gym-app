import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ShopService } from './shop.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('shop')
@Controller('v1')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('shop/products')
  findForBranch(@Query('branchId') branchId: string) {
    return this.shopService.findForBranch(branchId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/products')
  create(@Body() dto: CreateProductDto) {
    return this.shopService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shopService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/products/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.shopService.deactivate(id);
  }

  @Post('shop/reservations')
  reserve(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shopService.reserve(user.userId, dto);
  }

  @Get('me/reservations')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.shopService.findForUser(user.userId);
  }

  @Patch('shop/reservations/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shopService.cancel(id, user.userId);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Get('staff/reservations')
  findForBranchStaff(@Query('branchId') branchId: string) {
    return this.shopService.findForBranchStaff(branchId);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('staff/reservations/:id/ready')
  markReady(@Param('id') id: string) {
    return this.shopService.markReady(id);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('staff/reservations/:id/collected')
  markCollected(@Param('id') id: string) {
    return this.shopService.markCollected(id);
  }
}
