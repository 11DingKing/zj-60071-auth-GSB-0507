import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private prismaService: PrismaService) {}

  async create(tenantId: string, createRoleDto: CreateRoleDto) {
    const existingRole = await this.prismaService.role.findUnique({
      where: {
        code_tenantId: {
          code: createRoleDto.code,
          tenantId,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException('角色编码已存在');
    }

    if (createRoleDto.parentId) {
      const parentRole = await this.prismaService.role.findUnique({
        where: { id: createRoleDto.parentId },
      });

      if (!parentRole || parentRole.tenantId !== tenantId) {
        throw new BadRequestException('父角色不存在');
      }
    }

    const role = await this.prismaService.role.create({
      data: {
        name: createRoleDto.name,
        code: createRoleDto.code,
        tenantId,
        parentId: createRoleDto.parentId,
        dataScope: createRoleDto.dataScope,
        sort: createRoleDto.sort,
        description: createRoleDto.description,
        isEnabled: createRoleDto.isEnabled ?? true,
      },
    });

    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      await this.prismaService.rolePermission.createMany({
        data: createRoleDto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    return role;
  }

  async findAll(tenantId: string) {
    return this.prismaService.role.findMany({
      where: { tenantId },
      include: {
        parent: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { sort: 'asc' },
    });
  }

  async findTree(tenantId: string) {
    const allRoles = await this.prismaService.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { sort: 'asc' },
    });

    return this.buildTree(allRoles);
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
    const role = await this.prismaService.role.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async update(id: string, tenantId: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id, tenantId);

    if (updateRoleDto.code) {
      const existingRole = await this.prismaService.role.findUnique({
        where: {
          code_tenantId: {
            code: updateRoleDto.code,
            tenantId,
          },
        },
      });

      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('角色编码已存在');
      }
    }

    if (updateRoleDto.parentId) {
      if (updateRoleDto.parentId === id) {
        throw new BadRequestException('不能将自身设为父级');
      }

      const childrenIds = await this.getAllChildIds(id, tenantId);
      if (childrenIds.includes(updateRoleDto.parentId)) {
        throw new BadRequestException('不能将子节点设为父级');
      }
    }

    const updatedRole = await this.prismaService.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        code: updateRoleDto.code,
        parentId: updateRoleDto.parentId,
        dataScope: updateRoleDto.dataScope,
        sort: updateRoleDto.sort,
        description: updateRoleDto.description,
        isEnabled: updateRoleDto.isEnabled,
      },
    });

    if (updateRoleDto.permissionIds) {
      await this.prismaService.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (updateRoleDto.permissionIds.length > 0) {
        await this.prismaService.rolePermission.createMany({
          data: updateRoleDto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    return updatedRole;
  }

  private async getAllChildIds(id: string, tenantId: string): Promise<string[]> {
    const children = await this.prismaService.role.findMany({
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
    const role = await this.findOne(id, tenantId);

    const childrenCount = await this.prismaService.role.count({
      where: { parentId: id, tenantId },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('该角色下存在子角色，无法删除');
    }

    const userCount = await this.prismaService.userRole.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      throw new BadRequestException('该角色已被用户关联，无法删除');
    }

    await this.prismaService.rolePermission.deleteMany({
      where: { roleId: id },
    });

    return this.prismaService.role.delete({
      where: { id },
    });
  }
}
