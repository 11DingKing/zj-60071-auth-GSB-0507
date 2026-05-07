import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DataScopeService } from '../../common/utils/data-scope.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, DataScopeService],
  exports: [UserService],
})
export class UserModule {}
