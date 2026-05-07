import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';

@Injectable()
export class OperationLogService {
  constructor(private prismaService: PrismaService) {}

  async findAll(tenantId: string, queryDto: QueryOperationLogDto) {
    const { page, pageSize, module, operation, username, startTime, endTime } = queryDto;

    const where: any = { tenantId };

    if (module) {
      where.module = module;
    }

    if (operation) {
      where.operation = operation;
    }

    if (username) {
      where.username = {
        contains: username,
      };
    }

    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) {
        where.createdAt.gte = new Date(startTime);
      }
      if (endTime) {
        where.createdAt.lte = new Date(endTime);
      }
    }

    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      this.prismaService.operationLog.count({ where }),
      this.prismaService.operationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, tenantId: string) {
    return this.prismaService.operationLog.findUnique({
      where: { id },
    });
  }

  async clear(tenantId: string, beforeDate?: Date) {
    const where: any = { tenantId };

    if (beforeDate) {
      where.createdAt = {
        lt: beforeDate,
      };
    }

    const result = await this.prismaService.operationLog.deleteMany({ where });

    return { deletedCount: result.count };
  }

  async getModules(tenantId: string) {
    const modules = await this.prismaService.operationLog.findMany({
      where: { tenantId },
      select: { module: true },
      distinct: ['module'],
    });

    return modules.map((m) => m.module);
  }
}
