import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
