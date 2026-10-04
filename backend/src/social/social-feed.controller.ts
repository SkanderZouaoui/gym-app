import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { SocialFeedService } from './social-feed.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('social')
@Controller('v1')
export class SocialFeedController {
  constructor(private readonly feedService: SocialFeedService) {}

  @Get('feed')
  findFeed(@Query('cursor') cursor?: string) {
    return this.feedService.findFeed(cursor);
  }

  @Post('posts')
  createPost(@Body() dto: CreatePostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feedService.createPost(user.userId, dto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.feedService.deletePost(id, user.userId);
  }

  @Get('posts/:id/comments')
  getComments(@Param('id') id: string) {
    return this.feedService.getComments(id);
  }

  @Post('posts/:id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.addComment(id, user.userId, dto);
  }

  @Post('posts/:id/reactions')
  toggleReaction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.feedService.toggleReaction(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/posts/:id/hide')
  hidePost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.feedService.hidePost(id, user.userId);
  }
}
