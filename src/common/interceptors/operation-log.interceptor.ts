import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private prismaService: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const method = request.method;
    const shouldLog = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

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
      userAgent: request.headers['user-agent'],
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
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.saveLog({
          ...logData,
          duration,
          status: error.status || 500,
          errorMsg: error.message || '未知错误',
        });
        throw error;
      }),
    );
  }

  private async saveLog(data: any) {
    try {
      await this.prismaService.operationLog.create({
        data,
      });
    } catch (e) {
      console.error('Failed to save operation log:', e);
    }
  }

  private getModuleFromPath(path: string): string {
    const parts = path.split('/');
    return parts[3] || 'system';
  }

  private getOperation(method: string): string {
    const map: Record<string, string> = {
      POST: '新增',
      PUT: '修改',
      DELETE: '删除',
      PATCH: '更新',
    };
    return map[method] || '查询';
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }
}
