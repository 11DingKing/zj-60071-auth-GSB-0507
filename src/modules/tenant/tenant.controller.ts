import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('租户管理')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: '创建租户' })
  @RequirePermissions('tenant:create')
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: '获取租户列表' })
  @RequirePermissions('tenant:list')
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取租户详情' })
  @RequirePermissions('tenant:view')
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新租户' })
  @RequirePermissions('tenant:update')
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除租户' })
  @RequirePermissions('tenant:delete')
  async remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用租户' })
  @RequirePermissions('tenant:disable')
  async disable(@Param('id') id: string) {
    return this.tenantService.disable(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用租户' })
  @RequirePermissions('tenant:enable')
  async enable(@Param('id') id: string) {
    return this.tenantService.enable(id);
  }

  @Get(':id/config')
  @ApiOperation({ summary: '获取租户配置' })
  @RequirePermissions('tenant:config:view')
  async getConfig(@Param('id') id: string) {
    return this.tenantService.getConfig(id);
  }

  @Put(':id/config')
  @ApiOperation({ summary: '更新租户配置' })
  @RequirePermissions('tenant:config:update')
  async updateConfig(@Param('id') id: string, @Body() config: Record<string, any>) {
    return this.tenantService.updateConfig(id, config);
  }
}
