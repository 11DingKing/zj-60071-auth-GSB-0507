import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionCacheService } from "../utils/permission-cache.service";

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private prismaService: PrismaService,
    private permissionCacheService: PermissionCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    const method = request.method;
    const shouldLog = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

    if (!shouldLog) {
      return next.handle();
    }

    const user = request.user;
    const tenantId = request.tenantId || user?.tenantId;

    if (!user || !tenantId) {
      return next.handle();
    }

    const logData = {
      tenantId,
      userId: user.userId,
      username: user.username,
      module: this.getModuleFromPath(request.path),
      operation: this.getOperation(method),
      method: method,
      path: request.path,
      params: JSON.stringify({
        query: request.query,
        params: request.params,
        body: request.body,
      }),
      ip: this.getClientIp(request),
      userAgent: request.headers["user-agent"],
      status: 200,
      duration: 0,
    };

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.saveLog({
          ...logData,
          duration,
          result: data ? JSON.stringify(data).substring(0, 2000) : null,
        });
        this.invalidatePermissionCache(method, request.path, request).catch(
          (e) => {
            console.error("Failed to invalidate permission cache:", e);
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.saveLog({
          ...logData,
          duration,
          status: error.status || 500,
          errorMsg: error.message || "未知错误",
        });
        throw error;
      }),
    );
  }

  private saveLog(data: any) {
    setImmediate(async () => {
      try {
        await this.prismaService.operationLog.create({ data });
      } catch (e) {
        console.error("Failed to save operation log:", e);
      }
    });
  }

  private async invalidatePermissionCache(
    method: string,
    path: string,
    request: any,
  ): Promise<void> {
    const pathLower = path.toLowerCase();

    if (pathLower.includes("/roles")) {
      await this.handleRoleInvalidation(method, pathLower, request);
    } else if (pathLower.includes("/permissions")) {
      await this.handlePermissionInvalidation(method);
    } else if (pathLower.includes("/users")) {
      await this.handleUserInvalidation(method, pathLower, request);
    }
  }

  private async handleRoleInvalidation(
    method: string,
    path: string,
    request: any,
  ): Promise<void> {
    if (["PUT", "PATCH", "DELETE"].includes(method)) {
      const roleId = this.extractIdFromPath(path, "roles");
      if (roleId) {
        await this.invalidateUsersByRoleId(roleId);
      }
    }
  }

  private async handlePermissionInvalidation(method: string): Promise<void> {
    if (["PUT", "PATCH", "DELETE"].includes(method)) {
      await this.permissionCacheService.invalidateAll();
    }
  }

  private async handleUserInvalidation(
    method: string,
    path: string,
    request: any,
  ): Promise<void> {
    if (
      ["PUT", "PATCH"].includes(method) &&
      request.body?.roleIds !== undefined
    ) {
      const userId = this.extractIdFromPath(path, "users");
      if (userId) {
        await this.permissionCacheService.invalidateUser(userId);
      }
    } else if (method === "DELETE") {
      const userId = this.extractIdFromPath(path, "users");
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

  private getModuleFromPath(path: string): string {
    const parts = path.split("/");
    return parts[3] || "system";
  }

  private getOperation(method: string): string {
    const map: Record<string, string> = {
      POST: "新增",
      PUT: "修改",
      DELETE: "删除",
      PATCH: "更新",
    };
    return map[method] || "查询";
  }

  private getClientIp(request: any): string {
    return (
      request.headers["x-forwarded-for"] ||
      request.headers["x-real-ip"] ||
      request.ip ||
      request.connection?.remoteAddress ||
      "unknown"
    );
  }
}
