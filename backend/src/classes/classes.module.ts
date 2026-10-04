import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';

@Module({
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
