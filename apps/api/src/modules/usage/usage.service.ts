import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PlanLimits {
  tier: string;
  maxContacts: number;
  maxMonthlyMessages: number;
  maxPhoneNumbers: number;
  maxTeamMembers: number;
  features: string[];
}

export const PLAN_TIERS: Record<string, PlanLimits> = {
  STARTER: {
    tier: 'STARTER',
    maxContacts: 1000,
    maxMonthlyMessages: 2500,
    maxPhoneNumbers: 1,
    maxTeamMembers: 2,
    features: ['basic_crm', 'standard_templates', 'campaigns', 'webhooks'],
  },
  GROWTH: {
    tier: 'GROWTH',
    maxContacts: 10000,
    maxMonthlyMessages: 25000,
    maxPhoneNumbers: 3,
    maxTeamMembers: 10,
    features: ['advanced_crm', 'custom_fields', 'csv_imports', 'bot_flows', 'priority_rate_limits'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    maxContacts: 50000,
    maxMonthlyMessages: 100000,
    maxPhoneNumbers: 10,
    maxTeamMembers: 999,
    features: ['unlimited_team', 'custom_webhooks', 'dedicated_support', 'audit_retention', 'sla'],
  },
};

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantUsage(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const tier = org?.planTier?.toUpperCase() || 'STARTER';
    const plan = PLAN_TIERS[tier] || PLAN_TIERS.STARTER;

    const [contactCount, phoneCount, memberCount, campaigns] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.phoneNumber.count({ where: { organizationId } }),
      this.prisma.membership.count({ where: { organizationId, isActive: true } }),
      this.prisma.campaign.aggregate({
        where: { organizationId },
        _sum: { sentCount: true },
      }),
    ]);

    const messagesSentThisMonth = campaigns._sum.sentCount || 0;

    return {
      plan,
      usage: {
        contacts: {
          current: contactCount,
          limit: plan.maxContacts,
          isExceeded: contactCount >= plan.maxContacts,
        },
        monthlyMessages: {
          current: messagesSentThisMonth,
          limit: plan.maxMonthlyMessages,
          isExceeded: messagesSentThisMonth >= plan.maxMonthlyMessages,
        },
        phoneNumbers: {
          current: phoneCount,
          limit: plan.maxPhoneNumbers,
          isExceeded: phoneCount >= plan.maxPhoneNumbers,
        },
        teamMembers: {
          current: memberCount,
          limit: plan.maxTeamMembers,
          isExceeded: memberCount >= plan.maxTeamMembers,
        },
      },
      billing: {
        status: org?.status || 'ACTIVE',
        subscriptionRenewal: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        paymentProviderReady: true,
      },
    };
  }

  async verifyQuotaAvailable(organizationId: string, resource: 'contacts' | 'messages' | 'phoneNumbers') {
    const data = await this.getTenantUsage(organizationId);

    if (resource === 'contacts' && data.usage.contacts.isExceeded) {
      throw new BadRequestException(
        `Contact limit (${data.plan.maxContacts}) reached for ${data.plan.tier} plan. Please upgrade your subscription to import or create more contacts.`,
      );
    }

    if (resource === 'phoneNumbers' && data.usage.phoneNumbers.isExceeded) {
      throw new BadRequestException(
        `Phone number asset limit (${data.plan.maxPhoneNumbers}) reached for ${data.plan.tier} plan. Upgrade to connect more WhatsApp lines.`,
      );
    }
  }
}
