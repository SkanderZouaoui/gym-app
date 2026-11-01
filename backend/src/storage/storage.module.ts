import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StorageService } from './storage.service.js';
import { PhotoUrlInterceptor } from './photo-url.interceptor.js';
import { StorageCleanupService } from './storage-cleanup.service.js';
import { GalleryAssetsService } from './gallery-assets.service.js';

@Module({
  providers: [StorageService, GalleryAssetsService, StorageCleanupService, { provide: APP_INTERCEPTOR, useClass: PhotoUrlInterceptor }],
  exports: [StorageService, GalleryAssetsService],
})
export class StorageModule {}
