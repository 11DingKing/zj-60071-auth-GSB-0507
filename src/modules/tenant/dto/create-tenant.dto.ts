import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: '租户名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '租户编码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '配置', required: false })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
