import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from '../meta/meta-api.service';
import { QueueService } from '../queues/queue.service';
import { CampaignStatus, MessageStatus } from '@doot/shared';
import { normalizePhoneNumber } from '../contacts/phone-utils';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  phoneNumberId: string;
  templateId: string;
  // Audience options:
  tagIds?: string[];
  groupIds?: string[];
  contactIds?: string[];
  csvRecipients?: { phone: string; parameters?: Record<string, string> }[];
  isBulkCsv?: boolean;
  csvFilename?: string;
  // Variable parameter mapping:
  templateParameters?: Record<string, string>;
  // Scheduling:
  scheduledAt?: string;
  executeImmediately?: boolean;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly metaApi: MetaApiService,
    private readonly queueService: QueueService,
  ) {}

  async listCampaigns(organizationId: string, filter?: { isBulkCsv?: boolean; status?: CampaignStatus }) {
    const where: any = { organizationId };
    if (filter?.isBulkCsv !== undefined) {
      where.isBulkCsv = filter.isBulkCsv;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    const campaigns = await this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        phoneNumber: {
          select: { id: true, displayPhoneNumber: true, verifiedName: true },
        },
        template: {
          select: { id: true, name: true, language: true, category: true, components: true },
        },
      },
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isBulkCsv: c.isBulkCsv,
      csvFilename: c.csvFilename,
      status: c.status,
      phoneNumber: c.phoneNumber,
      template: c.template,
      totalRecipients: c.totalRecipients,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      readCount: c.readCount,
      failedCount: c.failedCount,
      scheduledAt: c.scheduledAt,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      createdAt: c.createdAt,
    }));
  }

  async getCampaign(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        phoneNumber: true,
        template: true,
        recipients: {
          take: 50,
          orderBy: { createdAt: 'asc' },
          include: {
            contact: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async createCampaign(organizationId: string, userId: string, dto: CreateCampaignDto) {
    // 1. Verify phone number belongs to active tenant
    const phone = await this.prisma.phoneNumber.findFirst({
      where: { id: dto.phoneNumberId, organizationId },
      include: { metaIntegration: true },
    });
    if (!phone) {
      throw new BadRequestException('Sending phone number not found in this organization');
    }

    // 2. Verify template belongs to tenant and is approved
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: dto.templateId, organizationId },
    });
    if (!template) {
      throw new BadRequestException('Template not found');
    }
    if (template.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot launch campaign with template status "${template.status}". Template must be APPROVED by Meta.`,
      );
    }

    // 3. Resolve audience recipients
    const recipientMap = new Map<string, { contactId?: string; phone: string; params: any }>();

    // A. Audience from CSV upload
    if (dto.isBulkCsv && dto.csvRecipients && dto.csvRecipients.length > 0) {
      for (const item of dto.csvRecipients) {
        const norm = normalizePhoneNumber(item.phone);
        if (norm.isValid && !recipientMap.has(norm.e164)) {
          recipientMap.set(norm.e164, {
            phone: norm.e164,
            params: item.parameters || dto.templateParameters || {},
          });
        }
      }
    } else {
      // B. Audience from Contacts / Tags / Groups
      const contactWhere: any = {
        organizationId,
        isBlocked: false,
        optedOutAt: null, // Strictly filter out opted-out contacts
      };

      if (dto.tagIds && dto.tagIds.length > 0) {
        contactWhere.tags = { some: { tagId: { in: dto.tagIds } } };
      }
      if (dto.groupIds && dto.groupIds.length > 0) {
        contactWhere.groupMemberships = { some: { groupId: { in: dto.groupIds } } };
      }
      if (dto.contactIds && dto.contactIds.length > 0) {
        contactWhere.id = { in: dto.contactIds };
      }

      const contacts = await this.prisma.contact.findMany({
        where: contactWhere,
      });

      for (const c of contacts) {
        if (!recipientMap.has(c.phone)) {
          recipientMap.set(c.phone, {
            contactId: c.id,
            phone: c.phone,
            params: dto.templateParameters || {},
          });
        }
      }
    }

    const totalRecipients = recipientMap.size;
    if (totalRecipients === 0) {
      throw new BadRequestException('Audience resolved to 0 eligible recipients. Check tags, groups, or opt-out status.');
    }

    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const initialStatus = dto.executeImmediately ? CampaignStatus.QUEUED : scheduledDate ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT;

    // 4. Create campaign and recipient records in transaction
    const campaign = await this.prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          organizationId,
          phoneNumberId: phone.id,
          templateId: template.id,
          name: dto.name,
          description: dto.description,
          isBulkCsv: !!dto.isBulkCsv,
          csvFilename: dto.csvFilename,
          status: initialStatus,
          totalRecipients,
          scheduledAt: scheduledDate,
          startedAt: dto.executeImmediately ? new Date() : null,
        },
      });

      for (const item of Array.from(recipientMap.values())) {
        await tx.campaignRecipient.create({
          data: {
            campaignId: camp.id,
            contactId: item.contactId,
            phone: item.phone,
            templateParameters: item.params,
            status: MessageStatus.SENDING,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'CREATE_WHATSAPP_CAMPAIGN',
          resource: 'campaign',
          resourceId: camp.id,
          metadata: {
            name: camp.name,
            totalRecipients,
            templateName: template.name,
            executeImmediately: dto.executeImmediately,
          },
        },
      });

      return camp;
    });

    // 5. If immediate execution, enqueue job to BullMQ
    if (dto.executeImmediately) {
      await this.queueService.addJob(
        'campaign-dispatch',
        'dispatch-campaign',
        { campaignId: campaign.id, organizationId },
        `camp_${campaign.id}`,
      );

      // Trigger dispatch processor in background
      this.executeCampaignDispatch(campaign.id).catch((err) =>
        this.logger.error(`Campaign dispatch error: ${err.message}`),
      );
    }

    return campaign;
  }

  /**
   * Controlled execution of campaign dispatch with rate limiting and Meta provider integration
   */
  async executeCampaignDispatch(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        phoneNumber: { include: { metaIntegration: true } },
        template: true,
        recipients: { where: { status: MessageStatus.SENDING } },
      },
    });

    if (!campaign || campaign.status === CampaignStatus.CANCELLED) {
      return;
    }

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.PROCESSING, startedAt: new Date() },
    });

    const plaintextToken = this.encryption.decrypt(campaign.phoneNumber.metaIntegration.encryptedAccessToken);
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      try {
        const metaRes = await this.metaApi.sendTemplateMessage(
          campaign.phoneNumber.phoneNumberId,
          plaintextToken,
          recipient.phone,
          campaign.template.name,
          campaign.template.language,
          [],
        );

        const metaMessageId = metaRes?.messages?.[0]?.id || `wamid.camp_${Date.now()}`;

        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.SENT,
            metaMessageId,
            sentAt: new Date(),
          },
        });
        sentCount++;
      } catch (err: any) {
        failedCount++;
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.FAILED,
            errorMessage: err.message,
          },
        });
      }

      // 50ms pacing (20 messages per second rate limit)
      await new Promise((r) => setTimeout(r, 50));
    }

    const finalStatus =
      failedCount === campaign.totalRecipients
        ? CampaignStatus.FAILED
        : failedCount > 0
        ? CampaignStatus.PARTIALLY_FAILED
        : CampaignStatus.COMPLETED;

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: finalStatus,
        sentCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Completed dispatch for campaign "${campaign.name}": ${sentCount} sent, ${failedCount} failed`);
  }

  async cancelCampaign(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.FAILED) {
      throw new BadRequestException('Cannot cancel a finished campaign');
    }

    return this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }
}
