import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DataScopeService } from '../../common/utils/data-scope.service';
import { DataScope } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private dataScopeService: DataScopeService,
  ) {}

  async create(tenantId: string, createUserDto: CreateUserDto, currentUserId: string, userRoles: string[]) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        username_tenantId: {
          username: createUserDto.username,
          tenantId,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: createUserDto.username,
        password: hashedPassword,
        tenantId,
        email: createUserDto.email,
        phone: createUserDto.phone,
        departmentId: createUserDto.departmentId,
        isEnabled: createUserDto.isEnabled ?? true,
      },
    });

    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      await this.prismaService.userRole.createMany({
        data: createUserDto.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    return user;
  }

  async findAll(
    tenantId: string,
    currentUserId: string,
    userRoles: string[],
    departmentId: string | null,
  ) {
    const maxDataScope = await this.getUserMaxDataScope(currentUserId, tenantId);
    const deptIds = await this.dataScopeService.getDepartmentIdsWithScope(
      departmentId,
      maxDataScope,
      tenantId,
    );

    const whereCondition = this.dataScopeService.buildWhereCondition(deptIds, maxDataScope, currentUserId);

    return this.prismaService.user.findMany({
      where: {
        tenantId,
        ...whereCondition,
      },
      include: {
        department: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        department: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async update(
    id: string,
    tenantId: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
  ) {
    const user = await this.findOne(id, tenantId);

    if (updateUserDto.username) {
      const existingUser = await this.prismaService.user.findUnique({
        where: {
          username_tenantId: {
            username: updateUserDto.username,
            tenantId,
          },
        },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('用户名已存在');
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        phone: updateUserDto.phone,
        departmentId: updateUserDto.departmentId,
        isEnabled: updateUserDto.isEnabled,
      },
    });

    if (updateUserDto.roleIds) {
      await this.prismaService.userRole.deleteMany({
        where: { userId: id },
      });

      if (updateUserDto.roleIds.length > 0) {
        await this.prismaService.userRole.createMany({
          data: updateUserDto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        });
      }
    }

    return updatedUser;
  }

  async remove(id: string, tenantId: string) {
    const user = await this.findOne(id, tenantId);

    await this.prismaService.userRole.deleteMany({
      where: { userId: id },
    });

    return this.prismaService.user.delete({
      where: { id },
    });
  }

  async resetPassword(id: string, tenantId: string, newPassword: string) {
    const user = await this.findOne(id, tenantId);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async createInvitation(
    tenantId: string,
    currentUserId: string,
    createInvitationDto: CreateInvitationDto,
  ) {
    const code = this.generateInvitationCode();

    let expiresAt: Date | undefined;
    if (createInvitationDto.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + createInvitationDto.expiresInDays);
    }

    return this.prismaService.invitationCode.create({
      data: {
        code,
        tenantId,
        createdBy: currentUserId,
        expiresAt,
      },
    });
  }

  async getInvitations(tenantId: string) {
    return this.prismaService.invitationCode.findMany({
      where: { tenantId },
      include: {
        usedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserMaxDataScope(userId: string, tenantId: string): Promise<DataScope> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    if (!userRoles || userRoles.length === 0) {
      return DataScope.SELF;
    }

    const scopePriority: Record<DataScope, number> = {
      [DataScope.ALL]: 4,
      [DataScope.DEPT_AND_CHILDREN]: 3,
      [DataScope.DEPT_ONLY]: 2,
      [DataScope.SELF]: 1,
    };

    let maxScope: DataScope = DataScope.SELF;

    for (const ur of userRoles) {
      const roleScope = ur.role.dataScope;
      if (scopePriority[roleScope] > scopePriority[maxScope]) {
        maxScope = roleScope;
      }

      let parent = await this.prismaService.role.findUnique({
        where: { id: ur.role.parentId || '' },
      });

      while (parent) {
        if (scopePriority[parent.dataScope] > scopePriority[maxScope]) {
          maxScope = parent.dataScope;
        }
        parent = await this.prismaService.role.findUnique({
          where: { id: parent.parentId || '' },
        });
      }
    }

    return maxScope;
  }

  private generateInvitationCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
