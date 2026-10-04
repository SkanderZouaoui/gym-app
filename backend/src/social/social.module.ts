import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service.js';
import { ModerationController } from './moderation.controller.js';
import { SocialFeedService } from './social-feed.service.js';
import { SocialFeedController } from './social-feed.controller.js';

@Module({
  controllers: [ModerationController, SocialFeedController],
  providers: [ModerationService, SocialFeedService],
  exports: [ModerationService, SocialFeedService],
})
export class SocialModule {}
