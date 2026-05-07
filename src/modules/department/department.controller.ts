import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { MoveDepartmentDto } from './dto/move-department.dto';
import { RequirePermissions, TenantId } from '../../common/decorators';

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: '创建部门' })
  @RequirePermissions('department:create')
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.create(tenantId, createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: '获取部门列表' })
  @RequirePermissions('department:list')
  async findAll(@TenantId() tenantId: string) {
    return this.departmentService.findAll(tenantId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取部门树' })
  @RequirePermissions('department:list')
  async getTree(@TenantId() tenantId: string) {
    return this.departmentService.findTree(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取部门详情' })
  @RequirePermissions('department:view')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.departmentService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新部门' })
  @RequirePermissions('department:update')
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.update(id, tenantId, updateDepartmentDto);
  }

  @Post(':id/move')
  @ApiOperation({ summary: '移动/拖拽调整部门层级' })
  @RequirePermissions('department:move')
  async move(
    @Param('id') id: string,
    @Body() moveDepartmentDto: MoveDepartmentDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.move(id, tenantId, moveDepartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除部门' })
  @RequirePermissions('department:delete')
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.departmentService.remove(id, tenantId);
  }
}
