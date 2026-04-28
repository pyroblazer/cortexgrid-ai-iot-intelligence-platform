/**
 * @file mqtt.service.ts
 * @description MQTT (Message Queuing Telemetry Transport) client service for
 * ingesting real-time telemetry data from IoT devices.
 *
 * ELI5: MQTT is a messaging protocol designed specifically for IoT devices.
 * It's like a group chat for machines. Devices "publish" (send) messages to
 * "topics" (channels), and our server "subscribes" to those topics to receive
 * the data. This is more efficient than HTTP for IoT because:
 *   - Persistent connection (no HTTP handshake overhead per message)
 *   - Lightweight protocol (smaller packets, less bandwidth)
 *   - Built-in reconnection and quality-of-service guarantees
 *
 * INGESTION FLOW:
 *   1. IoT device connects to the MQTT broker (e.g., Mosquitto, EMQX)
 *   2. Device publishes telemetry to a topic like "cortexgrid/devices/{id}/telemetry"
 *   3. Our API (this service) subscribes to wildcard topics to receive all messages
 *   4. Messages arrive at handleMessage(), which:
 *      a. Parses the topic to extract device ID and org ID
 *      b. Looks up the device in the database (by ID or serial number)
 *      c. For telemetry: calls TelemetryService.ingestFromMqtt()
 *      d. For status: directly updates the device's online/offline status
 *
 * TOPIC STRUCTURE:
 *   - cortexgrid/devices/{deviceId}/telemetry  - Sensor data from a device
 *   - cortexgrid/devices/{deviceId}/status     - Device online/offline status
 *   - cortexgrid/{orgId}/devices/{deviceId}/telemetry - Org-scoped telemetry
 *
 * WHY MQTT instead of HTTP for device data?
 *   - Devices can push data instantly (no polling)
 *   - One TCP connection handles thousands of messages
 *   - QoS levels ensure reliable delivery (QoS 1 = at least once)
 *   - Lower battery/power consumption on devices
 *   - Works well on unreliable networks (automatic reconnect)
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { TelemetryService } from '../telemetry.service';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Expected shape of an MQTT telemetry payload from a device. */
interface MqttTelemetryPayload {
  deviceId?: string;
  serialNumber?: string;
  metrics: Record<string, any>;
  timestamp?: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly telemetryService: TelemetryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Called automatically by NestJS when the module initializes.
   * Connects to the MQTT broker and sets up event handlers.
   */
  async onModuleInit() {
    const brokerUrl = this.configService.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',  // Default Mosquitto broker port
    );
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    try {
      // Connect to the MQTT broker with authentication and reliability settings.
      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        // Unique client ID includes process PID to avoid conflicts
        // if multiple API instances connect to the same broker.
        clientId: `cortexgrid-api-${process.pid}`,
        clean: true,             // Start fresh on reconnect (don't recover old session)
        reconnectPeriod: 5000,   // Try reconnecting every 5 seconds if connection drops
        connectTimeout: 30000,   // Give up connecting after 30 seconds
      });

      // Event: Successfully connected to the broker.
      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        // Subscribe to device topics now that we're connected.
        this.subscribeToTopics();
      });

      // Event: Connection error (broker unreachable, auth failed, etc.).
      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error', error.message);
      });

      // Event: Attempting to reconnect after a connection drop.
      this.client.on('reconnect', () => {
        this.logger.warn('Attempting MQTT reconnection...');
      });

      // Event: A message arrived on one of our subscribed topics.
      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
    } catch (error) {
      this.logger.error('Failed to initialize MQTT client', error);
    }
  }

  /**
   * Subscribe to MQTT topics that devices publish to.
   *
   * Uses MQTT wildcard patterns:
   *   + = single-level wildcard (matches any one segment)
   *   cortexgrid/devices/+/telemetry matches cortexgrid/devices/abc123/telemetry
   */
  private subscribeToTopics() {
    if (!this.client) return;

    // Subscribe to all device telemetry and status topics.
    // The + wildcard matches any device ID or organization ID.
    const topics = [
      'cortexgrid/devices/+/telemetry',     // Any device's telemetry
      'cortexgrid/devices/+/status',        // Any device's status update
      'cortexgrid/+/devices/+/telemetry',   // Org-scoped telemetry
    ];

    topics.forEach((topic) => {
      // QoS 1: "At least once" delivery. The broker ensures we receive
      // every message, even if it has to resend. More reliable than QoS 0.
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}`, err.message);
        } else {
          this.logger.log(`Subscribed to MQTT topic: ${topic}`);
        }
      });
    });
  }

  /**
   * Process an incoming MQTT message.
   *
   * ELI5: When a device sends data, this method figures out:
   *   1. Which device sent it (from the topic or payload)
   *   2. Which organization the device belongs to
   *   3. Whether it's telemetry data or a status update
   *   4. Routes it to the appropriate handler
   *
   * Steps:
   *   a. Parse the topic to extract device/org IDs
   *   b. If only serial number is provided, look up the device by serial
   *   c. If org ID isn't in the topic, look it up from the device record
   *   d. For status messages: update device status directly
   *   e. For telemetry messages: delegate to TelemetryService.ingestFromMqtt()
   */
  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = message.toString();

      // Parse the topic to extract device ID and organization ID.
      // Topics follow the patterns:
      //   cortexgrid/devices/:deviceId/telemetry  (4 parts)
      //   cortexgrid/:orgId/devices/:deviceId/telemetry  (5 parts)
      const topicParts = topic.split('/');
      let deviceId: string | undefined;
      let organizationId: string | undefined;

      if (topicParts.length === 4 && topicParts[1] === 'devices') {
        // Pattern: cortexgrid/devices/:deviceId/telemetry
        deviceId = topicParts[2];
      } else if (topicParts.length === 5 && topicParts[1] && topicParts[2] === 'devices') {
        // Pattern: cortexgrid/:orgId/devices/:deviceId/telemetry
        organizationId = topicParts[1];
        deviceId = topicParts[3];
      }

      if (!deviceId) {
        this.logger.warn(`Could not extract device ID from topic: ${topic}`);
        return;
      }

      const parsedPayload: MqttTelemetryPayload = JSON.parse(payload);

      // Some devices send their serial number instead of our internal device ID.
      // Look up the device by serial number to get our internal IDs.
      if (!parsedPayload.deviceId && parsedPayload.serialNumber) {
        const device = await this.prisma.device.findUnique({
          where: { serialNumber: parsedPayload.serialNumber },
        });
        if (!device) {
          this.logger.warn(`Device not found for serial: ${parsedPayload.serialNumber}`);
          return;
        }
        deviceId = device.id;
        organizationId = device.organizationId;
      }

      // If the topic didn't include the org ID, look it up from the device record.
      if (!organizationId) {
        const device = await this.prisma.device.findUnique({
          where: { id: deviceId },
          select: { organizationId: true },
        });
        if (!device) {
          this.logger.warn(`Device not found: ${deviceId}`);
          return;
        }
        organizationId = device.organizationId;
      }

      // ── Handle status messages (device online/offline) ──
      if (topic.endsWith('/status')) {
        const status = parsedPayload.metrics?.status as DeviceStatus;
        if (status && Object.values(DeviceStatus).includes(status)) {
          await this.prisma.device.update({
            where: { id: deviceId },
            data: { status, lastSeenAt: new Date() },
          });
          this.logger.debug(`Device ${deviceId} status updated: ${status}`);
        }
        return;  // Status messages don't need telemetry ingestion
      }

      // ── Handle telemetry messages (sensor data) ──
      // Use the device's timestamp if provided, otherwise use server time.
      const timestamp = parsedPayload.timestamp
        ? new Date(parsedPayload.timestamp)
        : new Date();

      // Delegate to TelemetryService which handles database storage,
      // Redis caching, and WebSocket broadcasting.
      await this.telemetryService.ingestFromMqtt(
        deviceId,
        organizationId,
        parsedPayload.metrics,
        timestamp,
      );

      this.logger.debug(
        `Telemetry ingested for device ${deviceId}: ${JSON.stringify(parsedPayload.metrics)}`,
      );
    } catch (error) {
      // Log errors but don't crash - we need to keep processing other messages.
      this.logger.error(
        `Error processing MQTT message on ${topic}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Publish a command to a specific device via MQTT.
   *
   * ELI5: This lets our API send instructions TO a device. For example,
   * "restart the sensor" or "change your reporting interval to 5 seconds".
   * The device subscribes to its own command topic and acts on messages.
   *
   * Uses QoS 1 to ensure the command is delivered at least once.
   */
  async publishToDevice(deviceId: string, command: string, payload: any): Promise<void> {
    // Guard: Don't try to publish if the MQTT client isn't connected.
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    const topic = `cortexgrid/devices/${deviceId}/commands`;
    const message = JSON.stringify({
      command,
      payload,
      timestamp: new Date().toISOString(),
    });

    // Wrap the publish callback in a Promise for async/await usage.
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to publish to ${topic}`, err.message);
          reject(err);
        } else {
          this.logger.debug(`Published to ${topic}: ${command}`);
          resolve();
        }
      });
    });
  }

  /**
   * Called automatically by NestJS when the application shuts down.
   * Gracefully disconnects from the MQTT broker.
   */
  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Disconnecting MQTT client...');
      this.client.end();  // Graceful disconnect (finishes pending messages)
    }
  }
}
