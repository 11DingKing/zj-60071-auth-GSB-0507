import { Controller, Get, Param, Query, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperationLogService } from './operation-log.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { RequirePermissions, TenantId } from '../../common/decorators';

@ApiTags('操作日志')
@ApiBearerAuth()
@Controller('operation-logs')
export class OperationLogController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '获取操作日志列表' })
  @RequirePermissions('operation-log:list')
  async findAll(
    @Query() queryDto: QueryOperationLogDto,
    @TenantId() tenantId: string,
  ) {
    return this.operationLogService.findAll(tenantId, queryDto);
  }

  @Get('modules')
  @ApiOperation({ summary: '获取模块列表' })
  @RequirePermissions('operation-log:list')
  async getModules(@TenantId() tenantId: string) {
    return this.operationLogService.getModules(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取操作日志详情' })
  @RequirePermissions('operation-log:view')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.operationLogService.findOne(id, tenantId);
  }

  @Delete()
  @ApiOperation({ summary: '清空操作日志' })
  @RequirePermissions('operation-log:delete')
  async clear(
    @TenantId() tenantId: string,
    @Body('beforeDate') beforeDate?: string,
  ) {
    const date = beforeDate ? new Date(beforeDate) : undefined;
    return this.operationLogService.clear(tenantId, date);
  }
}
