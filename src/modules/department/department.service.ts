import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { MoveDepartmentDto } from './dto/move-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prismaService: PrismaService) {}

  async create(tenantId: string, createDepartmentDto: CreateDepartmentDto) {
    if (createDepartmentDto.parentId) {
      const parentDepartment = await this.prismaService.department.findUnique({
        where: { id: createDepartmentDto.parentId },
      });

      if (!parentDepartment || parentDepartment.tenantId !== tenantId) {
        throw new BadRequestException('父部门不存在');
      }
    }

    return this.prismaService.department.create({
      data: {
        ...createDepartmentDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prismaService.department.findMany({
      where: { tenantId },
      include: {
        parent: true,
        users: true,
      },
      orderBy: { sort: 'asc' },
    });
  }

  async findTree(tenantId: string) {
    const allDepartments = await this.prismaService.department.findMany({
      where: { tenantId },
      include: {
        users: true,
      },
      orderBy: { sort: 'asc' },
    });

    return this.buildTree(allDepartments);
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
    const department = await this.prismaService.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        users: true,
      },
    });

    if (!department || department.tenantId !== tenantId) {
      throw new NotFoundException('部门不存在');
    }

    return department;
  }

  async update(
    id: string,
    tenantId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const department = await this.findOne(id, tenantId);

    if (updateDepartmentDto.parentId) {
      if (updateDepartmentDto.parentId === id) {
        throw new BadRequestException('不能将自身设为父级');
      }

      const childrenIds = await this.getAllChildIds(id, tenantId);
      if (childrenIds.includes(updateDepartmentDto.parentId)) {
        throw new BadRequestException('不能将子节点设为父级');
      }
    }

    return this.prismaService.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async move(
    id: string,
    tenantId: string,
    moveDepartmentDto: MoveDepartmentDto,
  ) {
    const department = await this.findOne(id, tenantId);

    const parentId = moveDepartmentDto.parentId === '' ? null : moveDepartmentDto.parentId;

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException('不能将自身移到自身下');
      }

      const childrenIds = await this.getAllChildIds(id, tenantId);
      if (childrenIds.includes(parentId)) {
        throw new BadRequestException('不能将部门移到其子部门下');
      }

      const parent = await this.prismaService.department.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.tenantId !== tenantId) {
        throw new BadRequestException('目标部门不存在');
      }
    }

    const updateData: any = {};
    if (moveDepartmentDto.parentId !== undefined) {
      updateData.parentId = parentId;
    }
    if (moveDepartmentDto.sort !== undefined) {
      updateData.sort = moveDepartmentDto.sort;
    }

    return this.prismaService.department.update({
      where: { id },
      data: updateData,
    });
  }

  private async getAllChildIds(id: string, tenantId: string): Promise<string[]> {
    const children = await this.prismaService.department.findMany({
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
    const department = await this.findOne(id, tenantId);

    const childrenCount = await this.prismaService.department.count({
      where: { parentId: id, tenantId },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('该部门下存在子部门，无法删除');
    }

    const userCount = await this.prismaService.user.count({
      where: { departmentId: id, tenantId },
    });

    if (userCount > 0) {
      throw new BadRequestException('该部门下存在用户，无法删除');
    }

    return this.prismaService.department.delete({
      where: { id },
    });
  }
}
