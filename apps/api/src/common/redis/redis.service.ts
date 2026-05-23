import {
  Injectable,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private readonly channelCallbacks = new Map<string, (msg: string) => void>();

  constructor(private readonly configService: ConfigService) {
    const baseOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      tls: this.configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: this.configService.get<number>('REDIS_MAX_RETRIES', 3),
      connectTimeout: this.configService.get<number>('REDIS_CONNECT_TIMEOUT', 5000),
    };

    this.client = new Redis(baseOptions);

    this.client.on('connect', () => this.logger.log('Redis client connected'));
    this.client.on('error', (err) =>
      this.logger.error('Redis client error', err),
    );
  }

  private getConnectionOptions() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      tls: this.configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: this.configService.get<number>('REDIS_MAX_RETRIES', 3),
    };
  }

  private ensurePublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis(this.getConnectionOptions());
    }
    return this.publisher;
  }

  private ensureSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = new Redis(this.getConnectionOptions());
      // Single message handler dispatches to per-channel callbacks (fixes listener leak)
      this.subscriber.on('message', (channel, msg) => {
        const cb = this.channelCallbacks.get(channel);
        if (cb) cb(msg);
      });
    }
    return this.subscriber;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async incrby(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.ensurePublisher().publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    this.channelCallbacks.set(channel, callback);
    await this.ensureSubscriber().subscribe(channel);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.channelCallbacks.delete(channel);
    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      this.logger.log('Redis connections closed');
    } catch (error) {
      this.logger.error('Error closing Redis connections', error);
    }
  }
}
