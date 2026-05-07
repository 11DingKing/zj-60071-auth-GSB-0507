import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: '部门名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '部门编码', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: '父部门ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: '排序', required: false })
  @IsNumber()
  @IsOptional()
  sort?: number;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
