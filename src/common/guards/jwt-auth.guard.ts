import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { PermissionCacheService } from "../utils/permission-cache.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prismaService: PrismaService,
    private redisService: RedisService,
    private permissionCacheService: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("未提供认证令牌");
    }

    const isBlacklisted = await this.redisService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedException("令牌已失效");
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isEnabled) {
        throw new UnauthorizedException("用户不存在或已禁用");
      }

      if (user.tenantId !== payload.tenantId) {
        throw new UnauthorizedException("租户不匹配");
      }

      request.user = await this.buildUserPayload(user);
      request.token = token;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException("认证失败");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  private async buildUserPayload(user: any): Promise<any> {
    const cached = await this.permissionCacheService.getCachedUserPayload(user.id);
    if (cached) {
      return cached;
    }

    const roles = new Set<string>();
    const permissions = new Set<string>();

    if (user.userRoles) {
      for (const ur of user.userRoles) {
        if (ur.role) {
          await this.collectRoleWithInheritance(ur.role, roles, permissions);
        }
      }
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      username: user.username,
      departmentId: user.departmentId,
      roles: Array.from(roles),
      permissions: Array.from(permissions),
    };

    await this.permissionCacheService.setCachedUserPayload(user.id, payload);

    return payload;
  }

  private async collectRoleWithInheritance(
    role: any,
    roles: Set<string>,
    permissions: Set<string>,
  ): Promise<void> {
    if (roles.has(role.code)) {
      return;
    }

    roles.add(role.code);

    if (role.rolePermissions) {
      for (const rp of role.rolePermissions) {
        if (rp.permission) {
          permissions.add(rp.permission.code);
        }
      }
    }

    if (role.parentId) {
      const parentRole = await this.prismaService.role.findUnique({
        where: { id: role.parentId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (parentRole) {
        await this.collectRoleWithInheritance(parentRole, roles, permissions);
      }
    }
  }
}
