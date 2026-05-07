import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RequirePermissions, TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @RequirePermissions('user:create')
  async create(
    @Body() createUserDto: CreateUserDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.create(
      tenantId,
      createUserDto,
      user.userId,
      user.roles,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @RequirePermissions('user:list')
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.findAll(
      tenantId,
      user.userId,
      user.roles,
      user.departmentId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @RequirePermissions('user:view')
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.userService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  @RequirePermissions('user:update')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.userService.update(id, tenantId, updateUserDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @RequirePermissions('user:delete')
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.userService.remove(id, tenantId);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  @RequirePermissions('user:reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @TenantId() tenantId: string,
  ) {
    return this.userService.resetPassword(id, tenantId, resetPasswordDto.newPassword);
  }

  @Post('invitations')
  @ApiOperation({ summary: '创建邀请码' })
  @RequirePermissions('user:invitation:create')
  async createInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.userService.createInvitation(tenantId, userId, createInvitationDto);
  }

  @Get('invitations/list')
  @ApiOperation({ summary: '获取邀请码列表' })
  @RequirePermissions('user:invitation:list')
  async getInvitations(@TenantId() tenantId: string) {
    return this.userService.getInvitations(tenantId);
  }
}
