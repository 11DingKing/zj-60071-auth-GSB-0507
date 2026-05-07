import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryOperationLogDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 20;

  @ApiProperty({ description: '模块名称', required: false })
  @IsString()
  @IsOptional()
  module?: string;

  @ApiProperty({ description: '操作类型', required: false })
  @IsString()
  @IsOptional()
  operation?: string;

  @ApiProperty({ description: '操作人', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: '开始时间', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
