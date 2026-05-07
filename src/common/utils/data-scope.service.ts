import { Injectable } from '@nestjs/common';
import { DataScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataScopeService {
  constructor(private prismaService: PrismaService) {}

  async getDepartmentIdsWithScope(
    departmentId: string | null,
    dataScope: DataScope,
    tenantId: string,
  ): Promise<string[]> {
    switch (dataScope) {
      case DataScope.ALL:
        return [];

      case DataScope.DEPT_AND_CHILDREN:
        if (!departmentId) {
          return [];
        }
        return await this.getDepartmentAndChildrenIds(departmentId, tenantId);

      case DataScope.DEPT_ONLY:
        if (!departmentId) {
          return [];
        }
        return [departmentId];

      case DataScope.SELF:
        return ['__self__'];

      default:
        return ['__self__'];
    }
  }

  private async getDepartmentAndChildrenIds(
    departmentId: string,
    tenantId: string,
  ): Promise<string[]> {
    const result = new Set<string>();
    const queue = [departmentId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      result.add(currentId);

      const children = await this.prismaService.department.findMany({
        where: {
          parentId: currentId,
          tenantId,
        },
        select: { id: true },
      });

      for (const child of children) {
        queue.push(child.id);
      }
    }

    return Array.from(result);
  }

  buildWhereCondition(
    departmentIds: string[],
    dataScope: DataScope,
    userId?: string,
  ): any {
    if (dataScope === DataScope.ALL || departmentIds.length === 0) {
      return {};
    }

    if (departmentIds.includes('__self__')) {
      return {
        id: userId,
      };
    }

    return {
      departmentId: {
        in: departmentIds,
      },
    };
  }
}
