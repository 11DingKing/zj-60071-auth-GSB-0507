import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
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

    next();
  }
}
