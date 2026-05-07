import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PermissionCacheService } from '../utils/permission-cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionCacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private permissionCacheService: PermissionCacheService,
    private prismaService: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path;

    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.handleInvalidation(method, path, request).catch((e) => {
          console.error('Failed to invalidate permission cache:', e);
        });
      }),
    );
  }

  private async handleInvalidation(method: string, path: string, request: any): Promise<void> {
    const pathLower = path.toLowerCase();

    if (pathLower.includes('/roles')) {
      await this.handleRoleInvalidation(method, pathLower, request);
    } else if (pathLower.includes('/permissions')) {
      await this.handlePermissionInvalidation(method, pathLower, request);
    } else if (pathLower.includes('/users')) {
      await this.handleUserInvalidation(method, pathLower, request);
    }
  }

  private async handleRoleInvalidation(method: string, path: string, request: any): Promise<void> {
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      const roleId = this.extractIdFromPath(path, 'roles');
      if (roleId) {
        await this.invalidateUsersByRoleId(roleId);
      }
    } else if (method === 'POST' && request.body?.permissionIds) {
      const roleId = request.body.id;
      if (roleId) {
        await this.invalidateUsersByRoleId(roleId);
      }
    }
  }

  private async handlePermissionInvalidation(method: string, path: string, request: any): Promise<void> {
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      await this.permissionCacheService.invalidateAll();
    }
  }

  private async handleUserInvalidation(method: string, path: string, request: any): Promise<void> {
    if (['PUT', 'PATCH'].includes(method) && request.body?.roleIds !== undefined) {
      const userId = this.extractIdFromPath(path, 'users');
      if (userId) {
        await this.permissionCacheService.invalidateUser(userId);
      }
    } else if (method === 'DELETE') {
      const userId = this.extractIdFromPath(path, 'users');
      if (userId) {
        await this.permissionCacheService.invalidateUser(userId);
      }
    }
  }

  private extractIdFromPath(path: string, resource: string): string | null {
    const regex = new RegExp(`/${resource}/([^/]+)`);
    const match = path.match(regex);
    return match ? match[1] : null;
  }

  private async invalidateUsersByRoleId(roleId: string): Promise<void> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    for (const ur of userRoles) {
      await this.permissionCacheService.invalidateUser(ur.userId);
    }
  }
}
