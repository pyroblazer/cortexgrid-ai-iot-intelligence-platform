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
 * 4. Each browser is in a "room" for their organization so they only see their data
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
import { RedisService } from '../../common/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
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

  constructor(private readonly redisService: RedisService) {}

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // When a browser connects, put it in an organization-specific "room"
    // so we only send it data that belongs to its organization
    const orgId = client.handshake.query.organizationId as string;
    if (orgId) {
      client.join(`org:${orgId}`);
      this.logger.debug(`Client ${client.id} joined org room: ${orgId}`);
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
  handleSubscribeDevice(client: Socket, deviceId: string) {
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
   * This is called when Redis receives a new telemetry message.
   */
  broadcastTelemetry(data: {
    deviceId: string;
    organizationId: string;
    metrics: Record<string, any>;
    timestamp: string;
  }) {
    const { organizationId, ...payload } = data;
    // Only send to browsers that belong to this organization
    this.server.to(`org:${organizationId}`).emit('telemetry', payload);
  }

  /**
   * Push a single-device update to all subscribers of that device.
   * Used on device detail pages where you only care about one sensor.
   */
  sendDeviceUpdate(deviceId: string, data: Record<string, any>) {
    this.server.to(`device:${deviceId}`).emit('telemetry:update', data);
  }
}
