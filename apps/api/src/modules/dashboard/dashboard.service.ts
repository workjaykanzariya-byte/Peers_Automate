import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // 1. Contacts & Leads count
    const [totalContacts, newLeads, wonLeads] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.contact.count({ where: { organizationId, leadStatus: 'NEW' } }),
      this.prisma.contact.count({ where: { organizationId, leadStatus: 'WON' } }),
    ]);

    // 2. WhatsApp Assets
    const phoneNumbers = await this.prisma.phoneNumber.findMany({
      where: { organizationId },
      select: {
        id: true,
        displayPhoneNumber: true,
        verifiedName: true,
        qualityRating: true,
        messagingLimitTier: true,
        status: true,
        isDefault: true,
      },
    });

    // 3. Templates metrics
    const [totalTemplates, approvedTemplates, pendingTemplates] = await Promise.all([
      this.prisma.whatsAppTemplate.count({ where: { organizationId } }),
      this.prisma.whatsAppTemplate.count({ where: { organizationId, status: 'APPROVED' } }),
      this.prisma.whatsAppTemplate.count({ where: { organizationId, status: 'PENDING' } }),
    ]);

    // 4. Automations
    const [totalFlows, activeFlows] = await Promise.all([
      this.prisma.automationFlow.count({ where: { organizationId } }),
      this.prisma.automationFlow.count({ where: { organizationId, isActive: true } }),
    ]);

    // 5. Campaigns
    const [totalCampaigns, activeCampaigns, campaignAggregates] = await Promise.all([
      this.prisma.campaign.count({ where: { organizationId } }),
      this.prisma.campaign.count({
        where: {
          organizationId,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
      }),
      this.prisma.campaign.aggregate({
        where: { organizationId },
        _sum: {
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
        },
      }),
    ]);

    // 6. Conversations & Messaging
    const [openConversations, unreadCount, recentMessagesCount] = await Promise.all([
      this.prisma.conversation.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.conversation.aggregate({
        where: { organizationId },
        _sum: { unreadCount: true },
      }),
      this.prisma.message.count({
        where: {
          organizationId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // 7. Webhook Reliability
    const [totalDeliveries, successfulDeliveries] = await Promise.all([
      this.prisma.webhookDeliveryLog.count({ where: { organizationId } }),
      this.prisma.webhookDeliveryLog.count({
        where: {
          organizationId,
          responseStatus: { gte: 200, lt: 300 },
        },
      }),
    ]);

    const webhookSuccessRate =
      totalDeliveries > 0
        ? Math.round((successfulDeliveries / totalDeliveries) * 100)
        : 100;

    // Plan limits definition
    const planContactLimit = org?.planTier === 'ENTERPRISE' ? 50000 : org?.planTier === 'GROWTH' ? 10000 : 1000;
    const planCampaignLimit = org?.planTier === 'ENTERPRISE' ? 100000 : org?.planTier === 'GROWTH' ? 25000 : 2500;

    return {
      organization: {
        id: org?.id,
        name: org?.name,
        slug: org?.slug,
        planTier: org?.planTier,
        status: org?.status,
        timezone: org?.timezone,
      },
      quotas: {
        contacts: {
          used: totalContacts,
          limit: planContactLimit,
          percentage: Math.min(Math.round((totalContacts / planContactLimit) * 100), 100),
        },
        monthlyMessages: {
          used: campaignAggregates._sum.sentCount || 0,
          limit: planCampaignLimit,
          percentage: Math.min(
            Math.round(((campaignAggregates._sum.sentCount || 0) / planCampaignLimit) * 100),
            100,
          ),
        },
      },
      contacts: {
        total: totalContacts,
        newLeads,
        wonLeads,
      },
      whatsapp: {
        connectedPhoneNumbers: phoneNumbers,
        defaultPhoneNumber: phoneNumbers.find((p) => p.isDefault) || phoneNumbers[0] || null,
        templates: {
          total: totalTemplates,
          approved: approvedTemplates,
          pending: pendingTemplates,
        },
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        totalRecipients: campaignAggregates._sum.totalRecipients || 0,
        sent: campaignAggregates._sum.sentCount || 0,
        delivered: campaignAggregates._sum.deliveredCount || 0,
        read: campaignAggregates._sum.readCount || 0,
        failed: campaignAggregates._sum.failedCount || 0,
      },
      conversations: {
        open: openConversations,
        totalUnread: unreadCount._sum.unreadCount || 0,
        messagesLast24h: recentMessagesCount,
      },
      automations: {
        total: totalFlows,
        active: activeFlows,
      },
      webhooks: {
        totalDeliveries,
        successfulDeliveries,
        successRatePercentage: webhookSuccessRate,
      },
    };
  }
}
