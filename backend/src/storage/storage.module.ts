import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StorageService } from './storage.service.js';
import { PhotoUrlInterceptor } from './photo-url.interceptor.js';
import { StorageCleanupService } from './storage-cleanup.service.js';

@Module({
  providers: [StorageService, StorageCleanupService, { provide: APP_INTERCEPTOR, useClass: PhotoUrlInterceptor }],
  exports: [StorageService],
})
export class StorageModule {}
