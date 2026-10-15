import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookSsrfService } from './webhook-ssrf.service';
import { WebhooksController } from './webhooks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookSsrfService],
  exports: [WebhooksService, WebhookSsrfService],
})
export class WebhooksModule {}
