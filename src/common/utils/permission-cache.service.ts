import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const CACHE_PREFIX = 'perm_cache';
const DEFAULT_TTL = 30 * 60;

@Injectable()
export class PermissionCacheService {
  constructor(private redisService: RedisService) {}

  private buildKey(userId: string): string {
    return `${CACHE_PREFIX}:${userId}`;
  }

  async getCachedUserPayload(userId: string): Promise<any | null> {
    const cached = await this.redisService.get(this.buildKey(userId));
    if (!cached) {
      return null;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  async setCachedUserPayload(userId: string, payload: any, ttl: number = DEFAULT_TTL): Promise<void> {
    await this.redisService.set(this.buildKey(userId), JSON.stringify(payload), ttl);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redisService.del(this.buildKey(userId));
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_PREFIX}:*`);
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_PREFIX}:*`);
  }
}
