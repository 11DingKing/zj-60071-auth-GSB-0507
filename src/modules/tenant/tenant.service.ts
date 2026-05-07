import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prismaService: PrismaService) {}

  async create(createTenantDto: CreateTenantDto) {
    const existingTenant = await this.prismaService.tenant.findUnique({
      where: { code: createTenantDto.code },
    });

    if (existingTenant) {
      throw new ConflictException('租户编码已存在');
    }

    return this.prismaService.tenant.create({
      data: createTenantDto,
    });
  }

  async findAll() {
    return this.prismaService.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id);

    if (updateTenantDto.code) {
      const existingTenant = await this.prismaService.tenant.findUnique({
        where: { code: updateTenantDto.code },
      });

      if (existingTenant && existingTenant.id !== id) {
        throw new ConflictException('租户编码已存在');
      }
    }

    return this.prismaService.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const userCount = await this.prismaService.user.count({
      where: { tenantId: id },
    });

    if (userCount > 0) {
      throw new BadRequestException('该租户下存在用户，无法删除');
    }

    return this.prismaService.tenant.delete({
      where: { id },
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prismaService.tenant.update({
      where: { id },
      data: { isEnabled: false },
    });
  }

  async enable(id: string) {
    await this.findOne(id);

    return this.prismaService.tenant.update({
      where: { id },
      data: { isEnabled: true },
    });
  }

  async getConfig(id: string) {
    const tenant = await this.findOne(id);
    return tenant.config;
  }

  async updateConfig(id: string, config: Record<string, any>) {
    await this.findOne(id);

    return this.prismaService.tenant.update({
      where: { id },
      data: { config },
    });
  }
}
