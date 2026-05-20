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
      maxRetriesPerRequest: 3, // лимит повторов при сетевых сбоях
      enableOfflineQueue: true, // буферизация команд при обрыве связи
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
    this.client.on('close', () => this.logger.warn('Redis disconnected'));
  }

  // сохранение данных с опциональным TTL
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  // чтение данных с безопасной десериализацией
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      this.logger.error(`JSON parse error for key: ${key}`);
      return null;
    }
  }

  // удаление ключа
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // оставшееся время жизни ключа в миллисекундах
  async pttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  // атомарный захват распределённого лока (SET key value EX ttl NX)
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK'; // true если лок получен, false если уже занят
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
