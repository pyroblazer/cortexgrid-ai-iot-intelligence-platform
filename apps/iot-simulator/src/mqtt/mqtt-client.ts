import mqtt, { MqttClient as NativeMqttClient } from 'mqtt';
import { logger } from '../utils/logger';

export interface MqttClientOptions {
  brokerUrl: string;
  username: string;
  password: string;
  clientId?: string;
}

export class MqttClient {
  private client: NativeMqttClient | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 20;
  private readonly baseReconnectDelayMs = 1000;
  private readonly maxReconnectDelayMs = 60000;
  private readonly options: MqttClientOptions;

  constructor(options: MqttClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectOptions: mqtt.IClientOptions = {
        clientId: this.options.clientId || `cortexgrid-simulator-${Math.random().toString(16).slice(2, 10)}`,
        username: this.options.username,
        password: this.options.password,
        clean: true,
        keepalive: 60,
        reconnectPeriod: 0, // We handle reconnection ourselves with backoff
      };

      logger.info(`Connecting to MQTT broker at ${this.options.brokerUrl}...`);

      this.client = mqtt.connect(this.options.brokerUrl, connectOptions);

      this.client.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to MQTT broker successfully');
        resolve();
      });

      this.client.on('error', (err) => {
        logger.error('MQTT connection error', { error: err.message });
        if (!this.connected) {
          reject(err);
        }
      });

      this.client.on('close', () => {
        if (this.connected) {
          logger.warn('MQTT connection closed unexpectedly');
          this.connected = false;
          this.attemptReconnect();
        }
      });

      this.client.on('offline', () => {
        logger.warn('MQTT client went offline');
        this.connected = false;
      });

      this.client.on('reconnect', () => {
        logger.info('MQTT client attempting reconnect');
      });
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs,
    );

    // Add jitter: +/- 25% of the delay
    const jitter = delay * 0.25 * (2 * Math.random() - 1);
    const actualDelay = Math.round(delay + jitter);

    logger.info(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${actualDelay}ms`);

    setTimeout(() => {
      if (!this.connected && this.client) {
        logger.info('Attempting MQTT reconnection...');
        this.client.reconnect();
      }
    }, actualDelay);
  }

  async publish(topic: string, payload: string | Buffer, qos: 0 | 1 | 2 = 1): Promise<void> {
    if (!this.client || !this.connected) {
      logger.warn('Cannot publish: MQTT client is not connected', { topic });
      throw new Error('MQTT client is not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos }, (err) => {
        if (err) {
          logger.error('Failed to publish message', { topic, error: err.message });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    logger.info('Disconnecting from MQTT broker...');
    return new Promise((resolve) => {
      this.client!.end(false, undefined, () => {
        this.connected = false;
        this.client = null;
        logger.info('Disconnected from MQTT broker');
        resolve();
      });
    });
  }
}
