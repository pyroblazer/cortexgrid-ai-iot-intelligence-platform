import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
