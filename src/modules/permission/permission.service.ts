import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionType } from '@prisma/client';

@Injectable()
export class PermissionService {
  constructor(private prismaService: PrismaService) {}

  async create(tenantId: string, createPermissionDto: CreatePermissionDto) {
    const existingPermission = await this.prismaService.permission.findUnique({
      where: {
        code_tenantId: {
          code: createPermissionDto.code,
          tenantId,
        },
      },
    });

    if (existingPermission) {
      throw new ConflictException('权限编码已存在');
    }

    if (createPermissionDto.parentId) {
      const parentPermission = await this.prismaService.permission.findUnique({
        where: { id: createPermissionDto.parentId },
      });

      if (!parentPermission || parentPermission.tenantId !== tenantId) {
        throw new BadRequestException('父权限不存在');
      }
    }

    return this.prismaService.permission.create({
      data: {
        ...createPermissionDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, type?: PermissionType) {
    const where: any = { tenantId };
    if (type) {
      where.type = type;
    }

    return this.prismaService.permission.findMany({
      where,
      include: {
        children: true,
      },
      orderBy: { sort: 'asc' },
    });
  }

  async findTree(tenantId: string) {
    const allPermissions = await this.prismaService.permission.findMany({
      where: { tenantId },
      orderBy: { sort: 'asc' },
    });

    return this.buildTree(allPermissions);
  }

  private buildTree(items: any[], parentId: string | null = null): any[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }

  async findOne(id: string, tenantId: string) {
    const permission = await this.prismaService.permission.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!permission || permission.tenantId !== tenantId) {
      throw new NotFoundException('权限不存在');
    }

    return permission;
  }

  async update(
    id: string,
    tenantId: string,
    updatePermissionDto: UpdatePermissionDto,
  ) {
    const permission = await this.findOne(id, tenantId);

    if (updatePermissionDto.code) {
      const existingPermission = await this.prismaService.permission.findUnique({
        where: {
          code_tenantId: {
            code: updatePermissionDto.code,
            tenantId,
          },
        },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('权限编码已存在');
      }
    }

    if (updatePermissionDto.parentId) {
      if (updatePermissionDto.parentId === id) {
        throw new BadRequestException('不能将自身设为父级');
      }

      const childrenIds = await this.getAllChildIds(id, tenantId);
      if (childrenIds.includes(updatePermissionDto.parentId)) {
        throw new BadRequestException('不能将子节点设为父级');
      }
    }

    return this.prismaService.permission.update({
      where: { id },
      data: updatePermissionDto,
    });
  }

  private async getAllChildIds(id: string, tenantId: string): Promise<string[]> {
    const children = await this.prismaService.permission.findMany({
      where: { parentId: id, tenantId },
      select: { id: true },
    });

    const ids = children.map((c) => c.id);
    for (const childId of ids) {
      const grandChildren = await this.getAllChildIds(childId, tenantId);
      ids.push(...grandChildren);
    }

    return ids;
  }

  async remove(id: string, tenantId: string) {
    const permission = await this.findOne(id, tenantId);

    const childrenCount = await this.prismaService.permission.count({
      where: { parentId: id, tenantId },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('该权限下存在子权限，无法删除');
    }

    const rolePermCount = await this.prismaService.rolePermission.count({
      where: { permissionId: id },
    });

    if (rolePermCount > 0) {
      throw new BadRequestException('该权限已被角色关联，无法删除');
    }

    return this.prismaService.permission.delete({
      where: { id },
    });
  }
}
