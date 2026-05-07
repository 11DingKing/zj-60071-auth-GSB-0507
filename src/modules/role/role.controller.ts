import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions, TenantId } from '../../common/decorators';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  @RequirePermissions('role:create')
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @TenantId() tenantId: string,
  ) {
    return this.roleService.create(tenantId, createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: '获取角色列表' })
  @RequirePermissions('role:list')
  async findAll(@TenantId() tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取角色树' })
  @RequirePermissions('role:list')
  async getTree(@TenantId() tenantId: string) {
    return this.roleService.findTree(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  @RequirePermissions('role:view')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.roleService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色' })
  @RequirePermissions('role:update')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @TenantId() tenantId: string,
  ) {
    return this.roleService.update(id, tenantId, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @RequirePermissions('role:delete')
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.roleService.remove(id, tenantId);
  }
}
