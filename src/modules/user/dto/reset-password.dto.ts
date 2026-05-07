import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: '新密码' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
