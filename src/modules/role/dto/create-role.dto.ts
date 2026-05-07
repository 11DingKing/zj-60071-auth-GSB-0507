import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataScope } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '角色编码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '父角色ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: '数据范围', enum: DataScope, required: false })
  @IsEnum(DataScope)
  @IsOptional()
  dataScope?: DataScope;

  @ApiProperty({ description: '排序', required: false })
  @IsNumber()
  @IsOptional()
  sort?: number;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '权限ID列表', required: false })
  @IsArray()
  @IsOptional()
  permissionIds?: string[];

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
