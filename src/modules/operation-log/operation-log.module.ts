import { Module } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import { OperationLogController } from './operation-log.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationLogController],
  providers: [OperationLogService],
  exports: [OperationLogService],
})
export class OperationLogModule {}
