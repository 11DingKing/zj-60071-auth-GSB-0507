import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisClient = new Redis({
      host,
      port,
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  get client(): Redis {
    return this.redisClient;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result > 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.redisClient.setex(key, seconds, value);
  }

  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return this.redisClient.del(...keys);
  }
}
