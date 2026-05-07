import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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
            (req as any).tenantId = payload.tenantId;
          }
        }
      } catch (e) {}
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

    const currentTenantId = (req as any).tenantId;
    if (currentTenantId) {
      this.validateTenantConsistency(req, currentTenantId);
    }

    next();
  }

  private validateTenantConsistency(req: Request, currentTenantId: string): void {
    const tenantIdsFromRequest: string[] = [];

    if (req.params && req.params.tenantId) {
      tenantIdsFromRequest.push(req.params.tenantId);
    }

    if (req.query && req.query.tenantId) {
      tenantIdsFromRequest.push(req.query.tenantId as string);
    }

    if (req.body && req.body.tenantId) {
      tenantIdsFromRequest.push(req.body.tenantId);
    }

    for (const tid of tenantIdsFromRequest) {
      if (tid !== currentTenantId) {
        throw new ForbiddenException('租户隔离校验失败，无权访问其他租户数据');
      }
    }
  }
}
