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
  ],
})
export class AppModule {}

