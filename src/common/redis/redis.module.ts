import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { PermissionCacheService } from '../utils/permission-cache.service';

@Module({
  providers: [RedisService, PermissionCacheService],
  exports: [RedisService, PermissionCacheService],
})
export class RedisModule {}
