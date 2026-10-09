import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  /** Réservation avec décrément atomique du stock — verrou transactionnel (section 12). */
  async reserve(userId: string, dto: CreateReservationDto) {
    const quantity = dto.quantity ?? 1;

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; stock: number; is_active: boolean }[]>`
        SELECT id, stock, is_active FROM products WHERE id = ${dto.productId} FOR UPDATE
      `;
      if (rows.length === 0) throw new NotFoundException('PRODUCT_NOT_FOUND');
      const product = rows[0];
      if (!product.is_active) throw new BadRequestException('PRODUCT_INACTIVE');
      if (product.stock < quantity) throw new BadRequestException('INSUFFICIENT_STOCK');

      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { decrement: quantity } },
      });

      return tx.productReservation.create({
        data: { productId: dto.productId, userId, quantity },
      });
    });
  }

  findForUser(userId: string) {
    return this.prisma.productReservation.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPendingForStaff() {
    return this.prisma.productReservation.findMany({
      where: { status: { in: ['PENDING', 'READY'] } },
      include: { product: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markReady(id: string) {
    return this.prisma.productReservation.update({ where: { id }, data: { status: 'READY' } });
  }

  async markCollected(id: string) {
    return this.prisma.productReservation.update({ where: { id }, data: { status: 'COLLECTED' } });
  }

  /** Annulation : restitue le stock. */
  async cancel(id: string, userId: string) {
    const reservation = await this.prisma.productReservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (reservation.status === 'CANCELLED' || reservation.status === 'COLLECTED') return reservation;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: reservation.productId },
        data: { stock: { increment: reservation.quantity } },
      });
      return tx.productReservation.update({ where: { id }, data: { status: 'CANCELLED' } });
    });
  }
}
