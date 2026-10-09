import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { UsersModule } from './users/users.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AccessPolicyModule } from './access-policy/access-policy.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { StaffModule } from './staff/staff.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AnnouncementsModule } from './announcements/announcements.module.js';
import { SocialModule } from './social/social.module.js';
import { CoachingModule } from './coaching/coaching.module.js';
import { BodyMetricsModule } from './body-metrics/body-metrics.module.js';
import { LoyaltyModule } from './loyalty/loyalty.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { ShopModule } from './shop/shop.module.js';
import { StatsModule } from './stats/stats.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    BranchesModule,
    UsersModule,
    MembershipsModule,
    PaymentsModule,
    AccessPolicyModule,
    ClassesModule,
    BookingsModule,
    AttendanceModule,
    StaffModule,
    AdminModule,
    AnnouncementsModule,
    SocialModule,
    CoachingModule,
    BodyMetricsModule,
    LoyaltyModule,
    MessagingModule,
    ShopModule,
    StatsModule,
    StorageModule,
    NotificationsModule,
  ],
})
export class AppModule {}
