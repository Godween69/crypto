import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      // ioredis автоматически переподключается при обрывах
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    const data = JSON.stringify(value);
    return ttlSeconds
      ? this.client.set(key, data, 'EX', ttlSeconds)
      : this.client.set(key, data);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null; // защита от битого JSON
    }
  }

  async del(key: string) {
    return this.client.del(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
