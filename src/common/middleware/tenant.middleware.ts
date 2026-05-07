import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let jwtTenantId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = this.jwtService.decode(token) as any;
        if (payload && payload.tenantId) {
          const tenant = await this.prismaService.tenant.findUnique({
            where: { id: payload.tenantId },
          });
          if (tenant && tenant.isEnabled) {
            jwtTenantId = payload.tenantId;
            (req as any).tenantId = jwtTenantId;
          }
        }
      } catch (e) {
        // Token decode failed, proceed without tenantId
      }
    }

    const tenantCode = req.headers['x-tenant-code'] as string;
    if (tenantCode && !(req as any).tenantId) {
      const tenant = await this.prismaService.tenant.findUnique({
        where: { code: tenantCode },
      });
      if (tenant && tenant.isEnabled) {
        (req as any).tenantId = tenant.id;
      }
    }

    if (jwtTenantId) {
      this.validateTenantIsolation(req, jwtTenantId);
    }

    next();
  }

  private validateTenantIsolation(req: Request, jwtTenantId: string): void {
    const paramTenantId = (req.params as any)?.tenantId;
    if (paramTenantId && paramTenantId !== jwtTenantId) {
      throw new ForbiddenException('租户隔离校验失败');
    }

    const queryTenantId = (req.query as any)?.tenantId;
    if (queryTenantId && queryTenantId !== jwtTenantId) {
      throw new ForbiddenException('租户隔离校验失败');
    }

    const bodyTenantId = (req.body as any)?.tenantId;
    if (bodyTenantId && bodyTenantId !== jwtTenantId) {
      throw new ForbiddenException('租户隔离校验失败');
    }
  }
}
