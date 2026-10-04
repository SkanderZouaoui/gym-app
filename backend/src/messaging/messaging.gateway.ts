import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service.js';
import type { AccessTokenPayload } from '../auth/types/jwt-payload.js';
import { AppEvent, type BookingAttendedEvent } from '../common/events.js';

/**
 * Temps réel (section 9.2) : messagerie et diffusion d'événements aux
 * utilisateurs connectés (confirmation de présence, mises à jour de
 * planning). Chaque socket rejoint une room nommée par son userId — les
 * autres services (ex. AttendanceService) peuvent émettre vers
 * `user:<id>` sans connaître les détails du transport.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'realtime' })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagingService: MessagingService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token ?? client.handshake.query?.token;
    if (!token || typeof token !== 'string') {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket déconnecté: ${client.data.userId ?? 'inconnu'}`);
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    await client.join(`conversation:${conversationId}`);
  }

  @SubscribeMessage('conversation:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; body: string },
  ) {
    const userId = client.data.userId as string;
    const message = await this.messagingService.sendMessage(payload.conversationId, userId, {
      body: payload.body,
    });
    this.server.to(`conversation:${payload.conversationId}`).emit('conversation:message', message);
    return message;
  }

  /** Confirmation de présence en temps réel à l'adhérent (section 6.2). */
  @OnEvent(AppEvent.BOOKING_ATTENDED)
  handleAttended(payload: BookingAttendedEvent) {
    this.server.to(`user:${payload.userId}`).emit('attendance:confirmed', {
      sessionId: payload.sessionId,
      classTypeName: payload.classTypeName,
    });
  }
}
