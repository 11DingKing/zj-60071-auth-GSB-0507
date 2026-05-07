import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RequirePermissions, TenantId } from '../../common/decorators';
import { PermissionType } from '@prisma/client';

@ApiTags('权限管理')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({ summary: '创建权限' })
  @RequirePermissions('permission:create')
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
    @TenantId() tenantId: string,
  ) {
    return this.permissionService.create(tenantId, createPermissionDto);
  }

  @Get()
  @ApiOperation({ summary: '获取权限列表' })
  @ApiQuery({ name: 'type', enum: PermissionType, required: false })
  @RequirePermissions('permission:list')
  async findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: PermissionType,
  ) {
    return this.permissionService.findAll(tenantId, type);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取权限树' })
  @RequirePermissions('permission:list')
  async getTree(@TenantId() tenantId: string) {
    return this.permissionService.findTree(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取权限详情' })
  @RequirePermissions('permission:view')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.permissionService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新权限' })
  @RequirePermissions('permission:update')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @TenantId() tenantId: string,
  ) {
    return this.permissionService.update(id, tenantId, updatePermissionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除权限' })
  @RequirePermissions('permission:delete')
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.permissionService.remove(id, tenantId);
  }
}
