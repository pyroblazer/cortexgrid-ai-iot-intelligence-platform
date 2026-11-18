/**
 * Telemetry WebSocket Gateway
 *
 * ELI5: This is like a TV station that broadcasts live sensor data.
 * When a temperature sensor sends a new reading, this gateway instantly
 * pushes it to all the dashboard screens that are watching that sensor.
 *
 * HOW IT WORKS:
 * 1. TelemetryService stores data in the database, then announces it on Redis
 * 2. This gateway listens to Redis announcements (like a radio receiver)
 * 3. When it hears something, it pushes the data through WebSocket to browsers
 * 4. Each socket is authenticated (JWT) and joins only its own organization's room
 *
 * WHY Redis pub/sub? The API server and WebSocket server might run on different
 * processes. Redis acts as the telephone line between them.
 */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  },
  namespace: '/telemetry',
})
export class TelemetryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.jwtService = new JwtService({});
  }

  private readonly jwtService: JwtService;

  afterInit() {
    this.logger.log('Telemetry WebSocket Gateway initialized');

    // Subscribe to the global telemetry channel that TelemetryService publishes to.
    // TelemetryService publishes to `telemetry:<orgId>` for each org.
    // We also subscribe to a global `telemetry_all` channel for cross-org monitoring.
    this.redisService.subscribe('telemetry_all', (message) => {
      try {
        const data = JSON.parse(message);
        this.broadcastTelemetry(data);
      } catch (error) {
        this.logger.error('Error parsing telemetry_all message', error);
      }
    });
  }

  /**
   * Authenticates every socket with the same JWT used for the REST API.
   * The organization is taken from the verified token (never from the client)
   * and membership is re-checked against the database.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('missing token');

      const payload = await this.jwtService.verifyAsync<{ sub: string; organizationId: string }>(
        token,
        { secret: this.configService.get<string>('JWT_ACCESS_SECRET') },
      );

      const membership = await this.prisma.membership.findFirst({
        where: {
          userId: payload.sub,
          organizationId: payload.organizationId,
          isActive: true,
          user: { isActive: true },
        },
        select: { id: true },
      });
      if (!membership) throw new Error('no active membership');

      client.data.organizationId = payload.organizationId;
      client.join(`org:${payload.organizationId}`);
      this.logger.debug(`Client ${client.id} joined org room: ${payload.organizationId}`);
    } catch (error) {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}: ${(error as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Allow clients to subscribe to a specific device's updates.
   * Called from the frontend when viewing a single device detail page.
   */
  @SubscribeMessage('subscribe:device')
  async handleSubscribeDevice(client: Socket, deviceId: string) {
    const organizationId = client.data.organizationId as string | undefined;
    if (!organizationId || typeof deviceId !== 'string') return;
    // Only allow subscribing to devices that belong to the caller's organization
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId },
      select: { id: true },
    });
    if (!device) {
      this.logger.warn(`Client ${client.id} denied subscription to device ${deviceId}`);
      return;
    }
    client.join(`device:${deviceId}`);
    this.logger.debug(`Client ${client.id} subscribed to device: ${deviceId}`);
  }

  /**
   * Allow clients to stop receiving updates for a specific device.
   */
  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(client: Socket, deviceId: string) {
    client.leave(`device:${deviceId}`);
  }

  /**
   * Broadcast telemetry data to all connected clients in the organization room.
   * Also pushes a per-device event for clients subscribed to a specific device.
   */
  broadcastTelemetry(data: {
    deviceId: string;
    organizationId: string;
    metrics: Record<string, any>;
    timestamp: string;
  }) {
    const { organizationId, ...payload } = data;
    // Broadcast to all browsers in this organization
    this.server.to(`org:${organizationId}`).emit('telemetry', payload);
    // Push per-device update for device detail page subscribers
    this.sendDeviceUpdate(data.deviceId, payload);
  }

  /**
   * Push a single-device update to all subscribers of that device.
   * Used on device detail pages where you only care about one sensor.
   */
  sendDeviceUpdate(deviceId: string, data: Record<string, any>) {
    this.server.to(`device:${deviceId}`).emit('telemetry:update', data);
  }
}
