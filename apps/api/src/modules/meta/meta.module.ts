import { Module, forwardRef } from '@nestjs/common';
import { MetaApiService } from './meta-api.service';
import { MetaAccountsService } from './meta-accounts.service';
import { MetaWebhookService } from './meta-webhook.service';
import { MetaController } from './meta.controller';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [AuthModule, WebhooksModule, forwardRef(() => AutomationsModule)],
  controllers: [MetaController],
  providers: [MetaApiService, MetaAccountsService, MetaWebhookService],
  exports: [MetaApiService, MetaAccountsService, MetaWebhookService],
})
export class MetaModule {}
