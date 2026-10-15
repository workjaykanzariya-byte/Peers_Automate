import { PrismaClient, UserRole, OrganizationStatus, QualityRating, TemplateCategory, TemplateStatus, ConversationStatus, MessageDirection, MessageType, MessageStatus, CampaignStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DOOT multi-tenant database...');

  const passwordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
  });

  // 1. Tenant 1: Acme Enterprises
  const acmeUser = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Acme',
      isPlatformAdmin: false,
    },
  });

  const acmeAgent = await prisma.user.upsert({
    where: { email: 'agent@acme.com' },
    update: {},
    create: {
      email: 'agent@acme.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Support',
      isPlatformAdmin: false,
    },
  });

  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-global' },
    update: {},
    create: {
      name: 'Acme Enterprises',
      slug: 'acme-global',
      planTier: 'GROWTH',
      status: OrganizationStatus.ACTIVE,
      timezone: 'America/New_York',
    },
  });

  // Memberships
  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: acmeUser.id,
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      userId: acmeUser.id,
      role: UserRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: acmeAgent.id,
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      userId: acmeAgent.id,
      role: UserRole.AGENT,
    },
  });

  // Meta Integration
  let acmeMeta = await prisma.metaIntegration.findFirst({
    where: { organizationId: acmeOrg.id, wabaId: 'waba_9876543210' },
  });
  if (!acmeMeta) {
    acmeMeta = await prisma.metaIntegration.create({
      data: {
        organizationId: acmeOrg.id,
        metaBusinessId: 'biz_1029384756',
        wabaId: 'waba_9876543210',
        name: 'Acme WhatsApp Business',
        encryptedAccessToken: 'v1:c0ffee:c0ffee:c0ffee',
        webhookVerifyToken: 'acme_verify_secret_token_123',
      },
    });
  }

  // Phone Number
  const acmePhone = await prisma.phoneNumber.upsert({
    where: { phoneNumberId: 'phone_1092837465' },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      metaIntegrationId: acmeMeta.id,
      phoneNumberId: 'phone_1092837465',
      displayPhoneNumber: '+1 (555) 019-2834',
      verifiedName: 'Acme Official Support',
      qualityRating: QualityRating.GREEN,
      messagingLimitTier: 'TIER_10K',
      isDefault: true,
    },
  });

  // Templates
  const templateWelcome = await prisma.whatsAppTemplate.upsert({
    where: {
      organizationId_name_language: {
        organizationId: acmeOrg.id,
        name: 'welcome_onboarding',
        language: 'en_US',
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      metaIntegrationId: acmeMeta.id,
      metaTemplateId: 'meta_tpl_welcome_01',
      name: 'welcome_onboarding',
      language: 'en_US',
      category: TemplateCategory.UTILITY,
      status: TemplateStatus.APPROVED,
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Welcome to Acme!' },
        { type: 'BODY', text: 'Hi {{1}}, thank you for joining Acme. Your onboarding code is {{2}}.' },
        { type: 'FOOTER', text: 'Reply STOP to unsubscribe' },
      ],
    },
  });

  // Contacts
  const contactJohn = await prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId: acmeOrg.id,
        phone: '+15551234567',
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      phone: '+15551234567',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      leadStatus: 'QUALIFIED',
      leadSource: 'Website Demo',
      assignedToUserId: acmeAgent.id,
    },
  });

  await prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId: acmeOrg.id,
        phone: '+15559876543',
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      phone: '+15559876543',
      firstName: 'Emma',
      lastName: 'Watson',
      email: 'emma@example.com',
      leadStatus: 'WON',
      leadSource: 'Campaign Referral',
    },
  });

  // Conversation
  let conversation = await prisma.conversation.findFirst({
    where: { organizationId: acmeOrg.id, contactId: contactJohn.id },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId: acmeOrg.id,
        contactId: contactJohn.id,
        phoneNumberId: acmePhone.id,
        assignedUserId: acmeAgent.id,
        status: ConversationStatus.OPEN,
        unreadCount: 0,
        windowExpiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
      },
    });

    await prisma.message.create({
      data: {
        organizationId: acmeOrg.id,
        conversationId: conversation.id,
        metaMessageId: `msg_${Date.now()}_1`,
        direction: MessageDirection.INBOUND,
        type: MessageType.TEXT,
        body: 'Hello! I would like to schedule a product demo for my team.',
        status: MessageStatus.READ,
        createdAt: new Date(Date.now() - 3600000),
      },
    });

    await prisma.message.create({
      data: {
        organizationId: acmeOrg.id,
        conversationId: conversation.id,
        metaMessageId: `msg_${Date.now()}_2`,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body: 'Hi John! I would be happy to help. Are you available this Thursday at 2 PM EST?',
        status: MessageStatus.DELIVERED,
        createdAt: new Date(Date.now() - 1800000),
      },
    });
  }

  // Campaign
  const existingCampaign = await prisma.campaign.findFirst({
    where: { organizationId: acmeOrg.id, name: 'October Welcome Series' },
  });

  if (!existingCampaign) {
    await prisma.campaign.create({
      data: {
        organizationId: acmeOrg.id,
        phoneNumberId: acmePhone.id,
        templateId: templateWelcome.id,
        name: 'October Welcome Series',
        status: CampaignStatus.COMPLETED,
        totalRecipients: 50,
        sentCount: 50,
        deliveredCount: 49,
        readCount: 42,
        failedCount: 1,
        startedAt: new Date(Date.now() - 86400000),
        completedAt: new Date(Date.now() - 85000000),
      },
    });
  }

  // 2. Tenant 2: Globex Corporation (completely isolated second tenant)
  const globexUser = await prisma.user.upsert({
    where: { email: 'ceo@globex.com' },
    update: {},
    create: {
      email: 'ceo@globex.com',
      passwordHash,
      firstName: 'Hank',
      lastName: 'Scorpio',
    },
  });

  const globexOrg = await prisma.organization.upsert({
    where: { slug: 'globex-corp' },
    update: {},
    create: {
      name: 'Globex Corporation',
      slug: 'globex-corp',
      planTier: 'ENTERPRISE',
      status: OrganizationStatus.ACTIVE,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: globexOrg.id,
        userId: globexUser.id,
      },
    },
    update: {},
    create: {
      organizationId: globexOrg.id,
      userId: globexUser.id,
      role: UserRole.OWNER,
    },
  });

  await prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId: globexOrg.id,
        phone: '+447700900123',
      },
    },
    update: {},
    create: {
      organizationId: globexOrg.id,
      phone: '+447700900123',
      firstName: 'Secret',
      lastName: 'Client',
      email: 'topsecret@globex.com',
      leadStatus: 'NEW',
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Tenant 1: Acme Enterprises (admin@acme.com / Password123!)');
  console.log('Tenant 2: Globex Corporation (ceo@globex.com / Password123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
