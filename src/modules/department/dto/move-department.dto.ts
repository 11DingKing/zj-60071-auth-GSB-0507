import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveDepartmentDto {
  @ApiProperty({ description: '新的父部门ID，为空则移到根级' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: '排序位置' })
  @IsNumber()
  @IsOptional()
  sort?: number;
}
