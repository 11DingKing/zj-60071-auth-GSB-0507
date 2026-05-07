import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    message: '密码至少8位，包含大小写字母和数字',
  })
  password: string;

  @ApiProperty({ description: '邀请码', required: false })
  @IsString()
  @IsOptional()
  invitationCode?: string;

  @ApiProperty({ description: '租户编码', required: false })
  @IsString()
  @IsOptional()
  tenantCode?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
