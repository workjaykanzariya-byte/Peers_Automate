import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { SecurityModule } from './security/security.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './modules/queues/queue.module';
import { MetaModule } from './modules/meta/meta.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { UsageModule } from './modules/usage/usage.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { MessengerModule } from './modules/messenger/messenger.module';
import { AiModule } from './modules/ai/ai.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    SecurityModule,
    QueueModule,
    AuthModule,
    OrganizationsModule,
    DashboardModule,
    HealthModule,
    MetaModule,
    ContactsModule,
    TemplatesModule,
    ConversationsModule,
    CampaignsModule,
    WebhooksModule,
    UsageModule,
    AdminModule,
    BillingModule,
    AutomationsModule,
    MessengerModule,
    AiModule,
    SupportModule,
  ],
})
export class AppModule {}

