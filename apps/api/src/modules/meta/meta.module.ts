import { Module } from '@nestjs/common';
import { MetaApiService } from './meta-api.service';
import { MetaAccountsService } from './meta-accounts.service';
import { MetaWebhookService } from './meta-webhook.service';
import { MetaController } from './meta.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MetaController],
  providers: [MetaApiService, MetaAccountsService, MetaWebhookService],
  exports: [MetaApiService, MetaAccountsService, MetaWebhookService],
})
export class MetaModule {}
