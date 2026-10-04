import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { UsersModule } from './users/users.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    BranchesModule,
    UsersModule,
    MembershipsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
