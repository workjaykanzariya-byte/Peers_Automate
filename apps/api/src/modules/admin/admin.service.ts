import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queues/queue.service';
import { OrganizationStatus } from '@doot/shared';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Aggregates real operational platform-wide metrics
   */
  async getPlatformStats() {
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      totalUsers,
      totalContacts,
      totalMessages,
      campaignStats,
      openTicketsCount,
      successfulWebhooks,
      failedWebhooks,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: OrganizationStatus.ACTIVE } }),
      this.prisma.organization.count({ where: { status: OrganizationStatus.SUSPENDED } }),
      this.prisma.user.count(),
      this.prisma.contact.count(),
      this.prisma.message.count(),
      this.prisma.campaign.aggregate({
        _sum: {
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
        },
        _count: { id: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['NEW', 'OPEN', 'PENDING'] } },
      }),
      this.prisma.webhookDeliveryLog.count({ where: { responseStatus: { gte: 200, lt: 300 } } }),
      this.prisma.webhookDeliveryLog.count({
        where: {
          OR: [{ responseStatus: { gte: 400 } }, { errorMessage: { not: null } }],
        },
      }),
    ]);

    // Calculate delivery success rate
    const totalAttempted = campaignStats._sum.sentCount || 0;
    const totalDelivered = campaignStats._sum.deliveredCount || 0;
    const campaignDeliveryRate = totalAttempted > 0 ? Math.round((totalDelivered / totalAttempted) * 100) : 100;

    // Queue status
    const queueHealth = await this.getQueueHealth();

    return {
      organizations: {
        total: totalOrgs,
        active: activeOrgs,
        trial: Math.max(0, totalOrgs - activeOrgs - suspendedOrgs),
        suspended: suspendedOrgs,
      },
      users: {
        total: totalUsers,
      },
      messaging: {
        totalContacts,
        totalMessages,
        campaignsRun: campaignStats._count.id,
        messagesDispatched: totalAttempted,
        messagesDelivered: totalDelivered,
        messagesRead: campaignStats._sum.readCount || 0,
        messagesFailed: campaignStats._sum.failedCount || 0,
        deliverySuccessRatePct: campaignDeliveryRate,
      },
      webhooks: {
        successful: successfulWebhooks,
        failed: failedWebhooks,
      },
      support: {
        openTickets: openTicketsCount,
      },
      queues: queueHealth,
      systemHealth: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Lists customer organizations with owner and usage summary
   */
  async listOrganizations(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              memberships: true,
              contacts: true,
              phoneNumbers: true,
              campaigns: true,
              messages: true,
            },
          },
        },
      }),
    ]);

    return {
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        planTier: org.planTier,
        subscriptionStatus: org.subscription?.status || 'ACTIVE',
        plan: org.subscription?.plan?.name || org.planTier,
        memberCount: org._count.memberships,
        contactCount: org._count.contacts,
        phoneCount: org._count.phoneNumbers,
        campaignCount: org._count.campaigns,
        messageCount: org._count.messages,
        createdAt: org.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Safely suspends or reactivates an organization without deleting data
   */
  async updateOrganizationStatus(
    orgId: string,
    status: OrganizationStatus,
    reason: string,
    adminUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { status },
    });

    // Record immutable security audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: adminUserId,
        action: `ORGANIZATION_${status}`,
        resource: 'ORGANIZATION',
        resourceId: orgId,
        metadata: {
          previousStatus: org.status,
          newStatus: status,
          reason: reason || 'Administrative action',
        },
      },
    });

    this.logger.log(`Admin ${adminUserId} changed Org ${orgId} status to ${status}. Reason: ${reason}`);
    return updated;
  }

  /**
   * Cross-organization User Management
   */
  async listUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isPlatformAdmin: true,
          createdAt: true,
          memberships: {
            select: {
              role: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Plans management
   */
  async listPlans() {
    return this.prisma.plan.findMany({
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async updatePlan(planId: string, data: any) {
    return this.prisma.plan.update({
      where: { id: planId },
      data,
    });
  }

  /**
   * Queue and Worker health inspection across BullMQ queues
   */
  async getQueueHealth() {
    const queueNames = [
      'campaign-dispatch',
      'contact-import',
      'webhook-delivery',
      'meta-events',
      'email-notification',
    ];

    const results: Record<string, any> = {};

    for (const name of queueNames) {
      const q = this.queueService.getQueue(name);
      if (q) {
        try {
          const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
          results[name] = {
            status: 'HEALTHY',
            counts,
          };
        } catch {
          results[name] = { status: 'STANDBY', counts: { waiting: 0, active: 0, completed: 0, failed: 0 } };
        }
      } else {
        results[name] = { status: 'STANDBY', counts: { waiting: 0, active: 0, completed: 0, failed: 0 } };
      }
    }

    return results;
  }

  /**
   * Platform-wide Security Audit Trail
   */
  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Comprehensive operational detail inspection for a single organization
   */
  async getOrganizationDetail(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: { plan: true },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
            },
          },
        },
        phoneNumbers: {
          include: {
            metaIntegration: {
              select: { id: true, name: true, wabaId: true, metaBusinessId: true, status: true, tokenKeyVersion: true, createdAt: true },
            },
          },
        },
        whatsappTemplates: {
          select: { id: true, name: true, language: true, category: true, status: true, createdAt: true },
          take: 10,
        },
        campaigns: {
          select: { id: true, name: true, status: true, totalRecipients: true, sentCount: true, deliveredCount: true, failedCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        messages: {
          select: {
            id: true,
            direction: true,
            type: true,
            status: true,
            body: true,
            metaMessageId: true,
            createdAt: true,
            conversation: {
              select: {
                contact: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
        webhookEndpoints: {
          select: { id: true, name: true, url: true, events: true, isActive: true, createdAt: true },
        },
        auditLogs: {
          select: { id: true, action: true, resource: true, createdAt: true, user: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            contacts: true,
            conversations: true,
            messages: true,
            campaigns: true,
            whatsappTemplates: true,
            phoneNumbers: true,
            memberships: true,
            webhookEndpoints: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Platform-wide Searchable Message Registry
   */
  async listMessages(page = 1, limit = 25, status?: string, search?: string, organizationId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      where.OR = [
        { body: { contains: search, mode: 'insensitive' } },
        { conversation: { contact: { phone: { contains: search } } } },
        { conversation: { contact: { firstName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          conversation: {
            select: {
              contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Platform-wide Campaign Registry
   */
  async listCampaigns(page = 1, limit = 20, status?: string, search?: string, organizationId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [total, campaigns] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          template: { select: { name: true, language: true } },
          phoneNumber: { select: { displayPhoneNumber: true } },
        },
      }),
    ]);

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Platform-wide Webhook Delivery Logs
   */
  async listWebhookLogs(page = 1, limit = 25, statusType?: 'ALL' | 'SUCCESS' | 'FAILED') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (statusType === 'SUCCESS') {
      where.responseStatus = { gte: 200, lt: 300 };
    } else if (statusType === 'FAILED') {
      where.OR = [{ responseStatus: { gte: 400 } }, { errorMessage: { not: null } }];
    }

    const [total, logs] = await Promise.all([
      this.prisma.webhookDeliveryLog.count({ where }),
      this.prisma.webhookDeliveryLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          webhookEndpoint: { select: { name: true, url: true } },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

