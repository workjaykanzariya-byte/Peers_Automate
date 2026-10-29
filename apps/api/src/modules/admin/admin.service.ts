import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queues/queue.service';
import { EncryptionService } from '../../security/encryption.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { OrganizationStatus, UserRole } from '@doot/shared';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly encryption: EncryptionService,
    private readonly webhooksService: WebhooksService,
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
          phoneNumbers: {
            include: { metaIntegration: true },
          },
          webhookEndpoints: true,
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
        timezone: org.timezone,
        phoneNumbers: org.phoneNumbers,
        webhookEndpoints: org.webhookEndpoints,
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
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Queue stats timeout')), 1000));
          const counts: any = await Promise.race([
            q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
            timeoutPromise,
          ]);
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
              select: {
                id: true,
                name: true,
                wabaId: true,
                metaBusinessId: true,
                status: true,
                webhookVerifyToken: true,
                tokenKeyVersion: true,
                createdAt: true,
              },
            },
          },
        },
        whatsappTemplates: {
          select: {
            id: true,
            name: true,
            language: true,
            category: true,
            status: true,
            createdAt: true,
            metaIntegrationId: true,
            metaIntegration: {
              select: {
                id: true,
                name: true,
                wabaId: true,
                webhookVerifyToken: true,
                phoneNumbers: {
                  select: {
                    id: true,
                    phoneNumberId: true,
                    displayPhoneNumber: true,
                    verifiedName: true,
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
          take: 500,
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
            errorCode: true,
            errorMessage: true,
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
          select: {
            id: true,
            name: true,
            url: true,
            secret: true,
            events: true,
            isActive: true,
            createdAt: true,
            _count: { select: { deliveryLogs: true } },
          },
          orderBy: { createdAt: 'desc' },
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

  /**
   * Platform Owner: Updates a customer organization's WhatsApp integration & phone asset details
   */
  async updateOrganizationIntegration(
    orgId: string,
    phoneId: string,
    dto: {
      verifiedName?: string;
      displayPhoneNumber?: string;
      phoneNumberId?: string;
      qualityRating?: string;
      messagingLimitTier?: string;
      status?: string;
      wabaId?: string;
      metaBusinessId?: string;
      accessToken?: string;
    },
    adminUserId: string,
  ) {
    const phone = await this.prisma.phoneNumber.findFirst({
      where: {
        id: phoneId,
        organizationId: orgId,
      },
      include: {
        metaIntegration: true,
      },
    });

    if (!phone) {
      throw new NotFoundException('WhatsApp phone number asset not found for this organization');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update PhoneNumber record
      const phoneUpdate: any = {};
      if (dto.verifiedName !== undefined) phoneUpdate.verifiedName = dto.verifiedName;
      if (dto.displayPhoneNumber !== undefined) phoneUpdate.displayPhoneNumber = dto.displayPhoneNumber;
      if (dto.phoneNumberId !== undefined) phoneUpdate.phoneNumberId = dto.phoneNumberId;
      if (dto.qualityRating !== undefined) phoneUpdate.qualityRating = dto.qualityRating as any;
      if (dto.messagingLimitTier !== undefined) phoneUpdate.messagingLimitTier = dto.messagingLimitTier;
      if (dto.status !== undefined) phoneUpdate.status = dto.status;

      const updatedPhone = await tx.phoneNumber.update({
        where: { id: phone.id },
        data: phoneUpdate,
      });

      // 2. Update MetaIntegration record if wabaId, metaBusinessId, verifiedName, or accessToken provided
      if (phone.metaIntegration) {
        const metaUpdate: any = {};
        if (dto.wabaId) metaUpdate.wabaId = dto.wabaId;
        if (dto.metaBusinessId) metaUpdate.metaBusinessId = dto.metaBusinessId;
        if (dto.verifiedName) metaUpdate.name = dto.verifiedName;
        if (dto.accessToken && dto.accessToken.trim().length > 10) {
          const { ciphertext, keyVersion } = this.encryption.encrypt(dto.accessToken.trim());
          metaUpdate.encryptedAccessToken = ciphertext;
          metaUpdate.tokenKeyVersion = keyVersion;
          metaUpdate.status = 'CONNECTED';
        }

        if (Object.keys(metaUpdate).length > 0) {
          await tx.metaIntegration.update({
            where: { id: phone.metaIntegration.id },
            data: metaUpdate,
          });
        }
      }

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: adminUserId,
          action: 'ADMIN_UPDATE_WHATSAPP_INTEGRATION',
          resource: 'PHONE_NUMBER',
          resourceId: phone.id,
          metadata: {
            phoneId,
            verifiedName: dto.verifiedName,
            displayPhone: dto.displayPhoneNumber,
            phoneNumberId: dto.phoneNumberId,
            wabaId: dto.wabaId,
            metaBusinessId: dto.metaBusinessId,
            qualityRating: dto.qualityRating,
            messagingLimitTier: dto.messagingLimitTier,
          },
        },
      });

      return {
        success: true,
        message: 'WhatsApp integration asset successfully updated',
        phone: updatedPhone,
      };
    });
  }

  /**
   * Platform Owner: Creates a brand new customer company account, tenant workspace,
   * initial owner credentials, subscription plan, and optional WhatsApp integration asset.
   */
  async createOrganization(
    dto: {
      name: string;
      slug?: string;
      planTier?: string;
      adminUser: {
        firstName: string;
        lastName?: string;
        email: string;
        password: string;
      };
      whatsappIntegration?: {
        name?: string;
        wabaId?: string;
        metaBusinessId?: string;
        phoneNumberId?: string;
        displayPhoneNumber?: string;
        verifiedName?: string;
        accessToken?: string;
        webhookVerifyToken?: string;
      };
      externalWebhookUrl?: string;
      externalWebhookToken?: string;
      externalWebhookSecret?: string;
    },
    platformAdminId: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminUser.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException(`A user with email "${dto.adminUser.email}" already exists`);
    }

    // Generate unique slug
    const baseSlug = (dto.slug || dto.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug}-${slugSuffix}`;

    const passwordHash = await argon2.hash(dto.adminUser.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const tier = dto.planTier?.toUpperCase() || 'STARTER';
    const plan = (await this.prisma.plan.findFirst({
      where: { tier },
    })) || (await this.prisma.plan.findFirst());

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug,
          planTier: tier,
          status: OrganizationStatus.ACTIVE,
        },
      });

      // 2. Create Initial Owner User
      const user = await tx.user.create({
        data: {
          email: dto.adminUser.email.toLowerCase().trim(),
          passwordHash,
          firstName: dto.adminUser.firstName?.trim() || 'Admin',
          lastName: dto.adminUser.lastName?.trim() || '',
          isActive: true,
          isPlatformAdmin: false,
        },
      });

      // 3. Link Membership as OWNER
      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: UserRole.OWNER,
          isActive: true,
        },
      });

      // 4. Create Active 1-Year Subscription
      if (plan) {
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            planId: plan.id,
            status: 'ACTIVE',
            provider: 'MANUAL',
            currentPeriodEnd: periodEnd,
          },
        });
      }

      // 5. If WhatsApp integration credentials supplied, configure Meta assets
      let createdPhone = null;
      const waba = dto.whatsappIntegration;
      if (waba && waba.phoneNumberId && waba.displayPhoneNumber) {
        const verifyToken = waba.webhookVerifyToken?.trim() || `peers_verify_${crypto.randomBytes(12).toString('hex')}`;
        let ciphertext = 'encrypted_placeholder';
        let keyVersion = 'v1';

        if (waba.accessToken && waba.accessToken.trim().length > 5) {
          const enc = this.encryption.encrypt(waba.accessToken.trim());
          ciphertext = enc.ciphertext;
          keyVersion = enc.keyVersion;
        }

        const metaIntegration = await tx.metaIntegration.create({
          data: {
            organizationId: org.id,
            metaBusinessId: waba.metaBusinessId?.trim() || 'biz_manual',
            wabaId: waba.wabaId?.trim() || 'waba_manual',
            name: waba.verifiedName?.trim() || waba.name?.trim() || dto.name.trim(),
            encryptedAccessToken: ciphertext,
            tokenKeyVersion: keyVersion,
            webhookVerifyToken: verifyToken,
            status: 'CONNECTED',
          },
        });

        createdPhone = await tx.phoneNumber.create({
          data: {
            organizationId: org.id,
            metaIntegrationId: metaIntegration.id,
            phoneNumberId: waba.phoneNumberId.trim(),
            displayPhoneNumber: waba.displayPhoneNumber.trim(),
            verifiedName: waba.verifiedName?.trim() || dto.name.trim(),
            qualityRating: 'GREEN',
            messagingLimitTier: 'TIER_10K',
            status: 'CONNECTED',
            isDefault: true,
          },
        });
      }

      // 6. If External Webhook URL provided, register outbound dynamic relay endpoint
      let createdRelay = null;
      if (dto.externalWebhookUrl && dto.externalWebhookUrl.trim().startsWith('http')) {
        const relaySecret = dto.externalWebhookToken?.trim() || dto.externalWebhookSecret?.trim() || 'doot_dynamic_verify_token_2026';
        createdRelay = await tx.webhookEndpoint.create({
          data: {
            organizationId: org.id,
            name: 'Primary External Webhook Relay',
            url: dto.externalWebhookUrl.trim(),
            secret: relaySecret,
            events: ['message.received', 'message.status_update'],
            isActive: true,
          },
        });
      }

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: platformAdminId,
          action: 'PLATFORM_OWNER_CREATE_ORGANIZATION',
          resource: 'ORGANIZATION',
          resourceId: org.id,
          metadata: {
            companyName: org.name,
            adminEmail: user.email,
            planTier: tier,
            hasWhatsApp: !!createdPhone,
          },
        },
      });

      return {
        success: true,
        message: `Company "${org.name}" successfully created with Owner access for ${user.email}`,
        organization: org,
        adminUser: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        phoneAsset: createdPhone,
        webhookEndpoint: createdRelay,
      };
    });
  }

  /**
   * Platform Owner: Purge all demo/seed non-owner accounts, leaving strictly owner@doot.io
   */
  async cleanDemoAccounts(platformAdminId: string) {
    const demoEmails = [
      'admin@acme.com',
      'agent@acme.com',
      'ceo@globex.com',
      'qa-user@doot-test.com',
      'user@doot-test.com',
    ];

    const usersToClean = await this.prisma.user.findMany({
      where: {
        isPlatformAdmin: false,
        email: { in: demoEmails },
      },
      select: { id: true, email: true },
    });

    if (usersToClean.length === 0) {
      return {
        success: true,
        message: 'No demo accounts found. Only master Platform Owner is active.',
        cleanedCount: 0,
      };
    }

    const ids = usersToClean.map((u) => u.id);

    // Delete refresh sessions, memberships, and user records
    await this.prisma.refreshSession.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.membership.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });

    await this.prisma.auditLog.create({
      data: {
        userId: platformAdminId,
        action: 'PLATFORM_OWNER_PURGE_DEMO_ACCOUNTS',
        resource: 'USER',
        metadata: { purgedEmails: demoEmails, count: usersToClean.length },
      },
    });

    return {
      success: true,
      message: `Successfully purged ${usersToClean.length} demo accounts. Master owner access preserved.`,
      cleanedCount: usersToClean.length,
      purgedEmails: usersToClean.map((u) => u.email),
    };
  }

  /**
   * Manage External Webhooks per Organization
   */
  async createOrgWebhook(
    orgId: string,
    dto: { name?: string; url: string; events?: string[]; secret?: string },
    adminUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.webhooksService.createEndpoint(orgId, adminUserId, {
      name: dto.name || 'External Relay Webhook',
      url: dto.url,
      events: dto.events || ['message.received', 'message.status_update'],
      secret: dto.secret,
    });
  }

  async updateOrgWebhook(orgId: string, webhookId: string, dto: any, adminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.webhooksService.updateEndpoint(orgId, webhookId, dto, adminUserId);
  }

  async deleteOrgWebhook(orgId: string, webhookId: string, adminUserId: string) {
    return this.webhooksService.deleteEndpoint(orgId, adminUserId, webhookId);
  }

  async testOrgWebhook(orgId: string, webhookId: string) {
    return this.webhooksService.testEndpoint(orgId, webhookId);
  }

  /**
   * Platform Owner: Update Customer Organization Details & Settings
   */
  async updateOrganization(orgId: string, dto: any, platformAdminId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        webhookEndpoints: true,
        phoneNumbers: {
          include: { metaIntegration: true },
        },
      },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updateData: any = {};
    if (dto.name && dto.name.trim()) updateData.name = dto.name.trim();
    if (dto.slug && dto.slug.trim()) updateData.slug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (dto.planTier) updateData.planTier = dto.planTier;
    if (dto.status) updateData.status = dto.status;
    if (dto.timezone) updateData.timezone = dto.timezone;
    if (dto.settings) updateData.settings = dto.settings;

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // If external relay webhook URL is provided, create or update the webhook endpoint
    if (dto.externalWebhookUrl !== undefined) {
      const existingEp = org.webhookEndpoints?.[0];
      if (dto.externalWebhookUrl.trim()) {
        if (existingEp) {
          await this.webhooksService.updateEndpoint(orgId, existingEp.id, {
            url: dto.externalWebhookUrl.trim(),
            secret: dto.externalWebhookToken?.trim() || existingEp.secret,
            isActive: dto.isWebhookActive !== undefined ? dto.isWebhookActive : true,
          }, platformAdminId);
        } else {
          await this.webhooksService.createEndpoint(orgId, platformAdminId, {
            name: `${updated.name} External Relay`,
            url: dto.externalWebhookUrl.trim(),
            secret: dto.externalWebhookToken?.trim() || 'unity_whatsapp_webhook_verify_token_2026',
            events: ['message.received', 'message.status_update'],
          });
        }
      } else if (existingEp && dto.externalWebhookUrl === '') {
        await this.webhooksService.updateEndpoint(orgId, existingEp.id, { isActive: false }, platformAdminId);
      }
    }

    // Update WhatsApp phone number & Meta integration credentials if provided
    if (
      dto.phoneNumberId !== undefined ||
      dto.displayPhoneNumber !== undefined ||
      dto.verifiedName !== undefined ||
      dto.wabaId !== undefined ||
      dto.metaBusinessId !== undefined ||
      dto.accessToken !== undefined ||
      dto.wabaName !== undefined
    ) {
      const existingPhone = org.phoneNumbers?.[0];
      const existingIntegration = existingPhone?.metaIntegration;

      if (existingPhone) {
        const phoneUpdate: any = {};
        if (dto.phoneNumberId) phoneUpdate.phoneNumberId = dto.phoneNumberId.trim();
        if (dto.displayPhoneNumber) phoneUpdate.displayPhoneNumber = dto.displayPhoneNumber.trim();
        if (dto.verifiedName) phoneUpdate.verifiedName = dto.verifiedName.trim();
        if (Object.keys(phoneUpdate).length > 0) {
          await this.prisma.phoneNumber.update({
            where: { id: existingPhone.id },
            data: phoneUpdate,
          });
        }

        if (existingIntegration) {
          const metaUpdate: any = {};
          if (dto.wabaId) metaUpdate.wabaId = dto.wabaId.trim();
          if (dto.metaBusinessId) metaUpdate.metaBusinessId = dto.metaBusinessId.trim();
          if (dto.wabaName) metaUpdate.name = dto.wabaName.trim();
          if (dto.accessToken && dto.accessToken.trim().length > 10) {
            const { ciphertext, keyVersion } = this.encryption.encrypt(dto.accessToken.trim());
            metaUpdate.encryptedAccessToken = ciphertext;
            metaUpdate.tokenKeyVersion = keyVersion;
            metaUpdate.status = 'CONNECTED';
          }
          if (Object.keys(metaUpdate).length > 0) {
            await this.prisma.metaIntegration.update({
              where: { id: existingIntegration.id },
              data: metaUpdate,
            });
          }
        }
      } else if (dto.phoneNumberId && dto.displayPhoneNumber) {
        const { ciphertext, keyVersion } = this.encryption.encrypt(dto.accessToken?.trim() || 'default_test_token');
        const integration = await this.prisma.metaIntegration.create({
          data: {
            organizationId: orgId,
            name: dto.wabaName?.trim() || `${updated.name} WhatsApp`,
            wabaId: dto.wabaId?.trim() || 'waba_placeholder',
            metaBusinessId: dto.metaBusinessId?.trim() || 'biz_placeholder',
            webhookVerifyToken: 'unity_whatsapp_webhook_verify_token_2026',
            encryptedAccessToken: ciphertext,
            tokenKeyVersion: keyVersion,
            status: 'CONNECTED',
          },
        });
        await this.prisma.phoneNumber.create({
          data: {
            organizationId: orgId,
            metaIntegrationId: integration.id,
            phoneNumberId: dto.phoneNumberId.trim(),
            displayPhoneNumber: dto.displayPhoneNumber.trim(),
            verifiedName: dto.verifiedName?.trim() || updated.name,
            status: 'CONNECTED',
            isDefault: true,
          },
        });
      }
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: platformAdminId,
          action: 'PLATFORM_OWNER_UPDATE_ORGANIZATION',
          resource: 'ORGANIZATION',
          resourceId: orgId,
          metadata: {
            updatedFields: Object.keys(updateData),
            hasWebhookUpdate: !!dto.externalWebhookUrl,
          },
        },
      });
    } catch (e) {
      // audit log fail-safe
    }

    return updated;
  }

  /**
   * Platform Owner: Delete an Organization Workspace
   */
  async deleteOrganization(orgId: string, platformAdminId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: platformAdminId,
        action: 'PLATFORM_OWNER_DELETE_ORGANIZATION',
        resource: 'ORGANIZATION',
        resourceId: org.id,
        metadata: { name: org.name, slug: org.slug },
      },
    });

    await this.prisma.organization.delete({
      where: { id: orgId },
    });

    return {
      success: true,
      message: `Organization "${org.name}" has been deleted successfully.`,
    };
  }
}


