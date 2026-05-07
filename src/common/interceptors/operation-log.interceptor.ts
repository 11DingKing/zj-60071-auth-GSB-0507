import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  invalidateUserPermissionCache,
  invalidateRolePermissionCache,
  invalidatePermissionCache,
} from "../utils/permission-cache.util";

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
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
        setImmediate(() => {
          this.handlePermissionCacheInvalidation(request, data);
          this.saveLog({
            ...logData,
            duration,
            result: data ? JSON.stringify(data).substring(0, 2000) : null,
          });
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        setImmediate(() => {
          this.saveLog({
            ...logData,
            duration,
            status: error.status || 500,
            errorMsg: error.message || "未知错误",
          });
        });
        throw error;
      }),
    );
  }

  private async handlePermissionCacheInvalidation(
    request: any,
    responseData: any,
  ): Promise<void> {
    try {
      const method = request.method;
      const path = request.path;
      const body = request.body;

      if (method === "PUT" && /\/users\/[^/]+$/.test(path)) {
        if (body && body.roleIds !== undefined) {
          const userId = request.params.id;
          if (userId) {
            await invalidateUserPermissionCache(userId, this.redisService);
          }
        }
      }

      if (method === "POST" && /\/users$/.test(path)) {
        if (responseData && responseData.id) {
          await invalidateUserPermissionCache(
            responseData.id,
            this.redisService,
          );
        }
      }

      if (
        (method === "PUT" || method === "POST" || method === "DELETE") &&
        /\/roles(\/[^/]+)?$/.test(path)
      ) {
        let roleId: string | null = null;
        if (method === "PUT" || method === "DELETE") {
          roleId = request.params.id;
        } else if (responseData && responseData.id) {
          roleId = responseData.id;
        }

        if (roleId) {
          await invalidateRolePermissionCache(
            roleId,
            this.prismaService,
            this.redisService,
          );
        }
      }

      if (
        (method === "PUT" || method === "POST" || method === "DELETE") &&
        /\/permissions(\/[^/]+)?$/.test(path)
      ) {
        let permissionId: string | null = null;
        if (method === "PUT" || method === "DELETE") {
          permissionId = request.params.id;
        } else if (responseData && responseData.id) {
          permissionId = responseData.id;
        }

        if (permissionId) {
          await invalidatePermissionCache(
            permissionId,
            this.prismaService,
            this.redisService,
          );
        }
      }
    } catch (e) {
      console.error("Failed to invalidate permission cache:", e);
    }
  }

  private async saveLog(data: any) {
    try {
      await this.prismaService.operationLog.create({
        data,
      });
    } catch (e) {
      console.error("Failed to save operation log:", e);
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
