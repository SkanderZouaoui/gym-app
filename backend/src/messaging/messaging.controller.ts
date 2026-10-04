import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('messaging')
@Controller('v1/conversations')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.findForUser(user.userId);
  }

  @Post()
  start(@Body() dto: StartConversationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.startConversation(user.userId, dto.otherUserId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getMessages(id, user.userId);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagingService.sendMessage(id, user.userId, dto);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.markRead(id, user.userId);
  }
}
