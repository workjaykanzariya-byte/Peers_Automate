import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queues/queue.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SecurityModule } from '../../security/security.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AuthModule, QueueModule, WebhooksModule, SecurityModule, BillingModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

