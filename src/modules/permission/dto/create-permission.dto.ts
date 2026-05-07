import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';

export class CreatePermissionDto {
  @ApiProperty({ description: '权限名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '权限编码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '权限类型', enum: PermissionType })
  @IsEnum(PermissionType)
  @IsNotEmpty()
  type: PermissionType;

  @ApiProperty({ description: '父权限ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: '路径', required: false })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiProperty({ description: 'HTTP方法', required: false })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiProperty({ description: '图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '排序', required: false })
  @IsNumber()
  @IsOptional()
  sort?: number;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
