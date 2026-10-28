import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../auth/types/jwt-payload.js';
import { AppEvent, type BookingAttendedEvent } from '../common/events.js';

/**
 * Temps réel (section 9.2) : diffusion d'événements aux utilisateurs connectés
 * (confirmation de présence). Chaque socket rejoint une room nommée par son
 * userId — les autres services (ex. AttendanceService) peuvent émettre vers
 * `user:<id>` sans connaître les détails du transport.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

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

  /** Confirmation de présence en temps réel à l'adhérent (section 6.2). */
  @OnEvent(AppEvent.BOOKING_ATTENDED)
  handleAttended(payload: BookingAttendedEvent) {
    this.server.to(`user:${payload.userId}`).emit('attendance:confirmed', {
      sessionId: payload.sessionId,
      classTypeName: payload.classTypeName,
    });
  }
}
