import { IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ description: '有效期天数', required: false })
  @IsNumber()
  @IsOptional()
  expiresInDays?: number;
}
