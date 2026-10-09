import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { StorageModule } from '../storage/storage.module.js';
import { OtpModule } from '../otp/otp.module.js';

@Module({
  imports: [StorageModule, OtpModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
