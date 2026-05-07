import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '部门ID', required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ description: '角色ID列表', required: false })
  @IsArray()
  @IsOptional()
  roleIds?: string[];

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
