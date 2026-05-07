import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export const PERMISSIONS_CACHE_KEY_PREFIX = 'permissions:user:';

export async function invalidateUserPermissionCache(
  userId: string,
  redisService: RedisService,
): Promise<void> {
  const cacheKey = `${PERMISSIONS_CACHE_KEY_PREFIX}${userId}`;
  await redisService.del(cacheKey);
}

export async function invalidateRolePermissionCache(
  roleId: string,
  prismaService: PrismaService,
  redisService: RedisService,
): Promise<void> {
  const userRoles = await prismaService.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  for (const ur of userRoles) {
    await invalidateUserPermissionCache(ur.userId, redisService);
  }
}

export async function invalidatePermissionCache(
  permissionId: string,
  prismaService: PrismaService,
  redisService: RedisService,
): Promise<void> {
  const rolePermissions = await prismaService.rolePermission.findMany({
    where: { permissionId },
    select: { roleId: true },
  });

  const roleIds = rolePermissions.map((rp) => rp.roleId);
  if (roleIds.length === 0) {
    return;
  }

  const userRoles = await prismaService.userRole.findMany({
    where: { roleId: { in: roleIds } },
    select: { userId: true },
  });

  const userIds = new Set(userRoles.map((ur) => ur.userId));
  for (const userId of userIds) {
    await invalidateUserPermissionCache(userId, redisService);
  }
}
