// back/src/redis/redis.service.ts

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client = new Redis({
    host: '127.0.0.1',
    port: 6379,
  });

  async set(key: string, value: any, ttlSeconds?: number) {
    const data = JSON.stringify(value);

    if (ttlSeconds) {
      return this.client.set(key, data, 'EX', ttlSeconds);
    }

    return this.client.set(key, data);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async del(key: string) {
    return this.client.del(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
