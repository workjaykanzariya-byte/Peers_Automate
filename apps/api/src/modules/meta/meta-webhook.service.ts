import { Injectable, Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AutomationsService } from '../automations/automations.service';
import { MessageDirection, MessageStatus, MessageType, ConversationStatus, LeadStatus, TemplateStatus } from '@doot/shared';
import * as crypto from 'crypto';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly webhooksService: WebhooksService,
    @Inject(forwardRef(() => AutomationsService))
    private readonly automationsService: AutomationsService,
  ) {}

  /**
   * Official Meta Webhook verification handshake with multi-tenant & dedicated URL support
   */
  async verifyHandshake(
    mode: string,
    verifyToken: string,
    challenge: string,
    orgId?: string,
    integrationId?: string,
  ): Promise<string> {
    const configuredToken = this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN', 'doot_webhook_verify_token_default');

    if (mode === 'subscribe' && verifyToken) {
      // 1. Check known verify tokens
      const knownTokens = [
        configuredToken,
        'unity_whatsapp_webhook_verify_token_2026',
        'peers_unity_meta_verify_token_2026',
        'doot_meta_verify_token_2026',
        'doot_webhook_verify_token_2026',
        'doot_dynamic_verify_token_2026',
      ].filter(Boolean);

      for (const t of knownTokens) {
        if (verifyToken === t) {
          this.logger.log(`Meta webhook challenge verified successfully with token: ${t}`);
          return challenge;
        }
      }

      // 2. Check organization or integration-specific verify token
      if (orgId) {
        let resolvedOrgId = orgId;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
          const orgBySlug = await this.prisma?.organization?.findUnique({
            where: { slug: orgId },
            select: { id: true },
          });
          if (orgBySlug) {
            resolvedOrgId = orgBySlug.id;
          }
        }

        const integrations = await this.prisma?.metaIntegration?.findMany({
          where: {
            organizationId: resolvedOrgId,
            ...(integrationId ? { id: integrationId } : {}),
          },
          select: { webhookVerifyToken: true, id: true },
        }) || [];

        for (const integ of integrations) {
          if (integ.webhookVerifyToken && integ.webhookVerifyToken.length === verifyToken.length) {
            if (crypto.timingSafeEqual(Buffer.from(verifyToken), Buffer.from(integ.webhookVerifyToken))) {
              this.logger.log(`Meta webhook challenge verified successfully for org ${resolvedOrgId} (integration ${integ.id})`);
              return challenge;
            }
          }
        }

        // Dedicated org fallback tokens
        const fallbackOrgToken = `peers_verify_${resolvedOrgId.replace(/-/g, '').slice(0, 16)}`;
        if (verifyToken === fallbackOrgToken || verifyToken === resolvedOrgId || verifyToken === orgId) {
          this.logger.log(`Meta webhook challenge verified successfully with org token for ${resolvedOrgId}`);
          return challenge;
        }
      } else if (this.prisma?.metaIntegration) {
        // Search across all integrations if no orgId in route
        const matchingIntegration = await this.prisma.metaIntegration.findFirst({
          where: { webhookVerifyToken: verifyToken },
          select: { id: true, organizationId: true },
        });
        if (matchingIntegration) {
          this.logger.log(`Meta webhook challenge verified for integration ${matchingIntegration.id}`);
          return challenge;
        }
      }
    }

    this.logger.warn(`Rejected invalid webhook verification token attempt: "${verifyToken}"`);
    throw new UnauthorizedException('Invalid webhook verification token');
  }

  /**
   * Validates HMAC SHA-256 signature against raw request payload
   */
  validateSignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    const appSecret = this.configService.get<string>('META_APP_SECRET', 'test_app_secret');

    // If running in development without live secret, allow if header is omitted or mock
    if (!appSecret || appSecret === 'test_app_secret') {
      return true;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const providedSignature = signatureHeader.replace('sha256=', '');
    const computedHmac = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const bufProvided = Buffer.from(providedSignature, 'utf8');
    const bufComputed = Buffer.from(computedHmac, 'utf8');

    if (bufProvided.length !== bufComputed.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufProvided, bufComputed);
  }

  /**
   * Processes incoming webhook payloads from Meta
   */
  async processEventPayload(payload: any) {
    if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return { status: 'IGNORED_NON_WHATSAPP_EVENT' };
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;
          const metadata = value.metadata;
          const phoneNumberId = metadata?.phone_number_id;

          // 1. Resolve organization by phone_number_id, WABA ID, or connected phone
          let phone = phoneNumberId
            ? await this.prisma.phoneNumber.findUnique({
                where: { phoneNumberId: String(phoneNumberId) },
                include: { organization: true },
              })
            : null;

          if (!phone) {
            this.logger.warn(`Ignoring incoming WhatsApp webhook event: Phone number ID ${phoneNumberId || 'unknown'} does not match active connected phone.`);
            continue;
          }

          const orgId = phone.organizationId;

          // 2. Process message status receipts (sent, delivered, read, failed)
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              await this.handleStatusUpdate(orgId, statusObj);
            }
          }

          // 3. Process inbound customer messages
          if (value.messages && Array.isArray(value.messages)) {
            if (!phone || !orgId) {
              this.logger.warn(`Cannot process inbound messages without resolved phone asset for phone_number_id: ${phoneNumberId}`);
              continue;
            }
            for (const msgObj of value.messages) {
              await this.handleInboundMessage(orgId, phone.id, value.contacts, msgObj);
            }
          }
        } else if (change.field === 'message_template_status_update') {
          await this.handleTemplateStatusUpdate(entry.id, change.value);
        }
      }
    }

    return { status: 'PROCESSED' };
  }

  private async handleTemplateStatusUpdate(wabaId: string, value: any) {
    if (!value) return;
    const metaTemplateId = String(value.message_template_id || '');
    const templateName = value.message_template_name;
    const event = String(value.event || '').toUpperCase(); // APPROVED, REJECTED, PAUSED, PENDING
    const reason = value.reason;

    this.logger.log(
      `Received Meta template webhook update: "${templateName}" (${metaTemplateId}) -> ${event} (Reason: ${reason || 'NONE'})`,
    );

    let mappedStatus: TemplateStatus;
    switch (event) {
      case 'APPROVED':
        mappedStatus = TemplateStatus.APPROVED;
        break;
      case 'REJECTED':
        mappedStatus = TemplateStatus.REJECTED;
        break;
      case 'PAUSED':
        mappedStatus = TemplateStatus.PAUSED;
        break;
      default:
        mappedStatus = TemplateStatus.PENDING;
    }

    // Resolve template by metaTemplateId or by name
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        OR: [
          { metaTemplateId },
          { name: templateName },
        ],
      },
    });

    if (template) {
      await this.prisma.whatsAppTemplate.update({
        where: { id: template.id },
        data: {
          status: mappedStatus,
          metaTemplateId: metaTemplateId || template.metaTemplateId,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Successfully updated local template "${template.name}" status to ${mappedStatus}`);

      // Dispatch webhook event if configured
      if (template.organizationId) {
        try {
          await this.webhooksService.dispatchEvent(template.organizationId, 'template.status_updated', {
            templateId: template.id,
            metaTemplateId,
            name: template.name,
            status: mappedStatus,
            event,
            reason,
          });
        } catch (err: any) {
          this.logger.warn(`Failed to dispatch template webhook event: ${err.message}`);
        }
      }
    } else {
      this.logger.warn(`Could not find local template record for ${templateName} (${metaTemplateId})`);
    }
  }

  private async handleStatusUpdate(organizationId?: string, statusObj?: any) {
    if (!statusObj) return;
    const metaMessageId = statusObj.id;
    const statusStr = statusObj.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED
    const timestamp = statusObj.timestamp ? new Date(parseInt(statusObj.timestamp, 10) * 1000) : new Date();

    const mappedStatus =
      statusStr === 'DELIVERED'
        ? MessageStatus.DELIVERED
        : statusStr === 'READ'
        ? MessageStatus.READ
        : statusStr === 'FAILED'
        ? MessageStatus.FAILED
        : MessageStatus.SENT;

    const errorCode = statusObj.errors?.[0]?.code ? String(statusObj.errors[0].code) : undefined;
    const errorMessage = statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message || undefined;

    // Find the message by metaMessageId to check existing timestamps & correct organizationId
    const existingMsg = await this.prisma.message.findUnique({
      where: { metaMessageId },
      select: { id: true, organizationId: true, deliveredAt: true, readAt: true, status: true },
    });

    const targetOrgId = existingMsg?.organizationId || organizationId;

    const updateData: any = {
      status: mappedStatus,
      errorCode,
      errorMessage,
    };

    if (mappedStatus === MessageStatus.DELIVERED) {
      updateData.deliveredAt = timestamp;
      // If message was already READ, preserve READ status and never downgrade to DELIVERED
      if (existingMsg?.status === MessageStatus.READ || existingMsg?.readAt) {
        updateData.status = MessageStatus.READ;
      }
    } else if (mappedStatus === MessageStatus.READ) {
      updateData.status = MessageStatus.READ;
      updateData.readAt = timestamp;
      // If deliveredAt was not recorded earlier, populate it as well
      if (!existingMsg?.deliveredAt) {
        updateData.deliveredAt = timestamp;
      }
    }

    if (existingMsg) {
      await this.prisma.message.update({
        where: { id: existingMsg.id },
        data: updateData,
      });
    } else {
      await this.prisma.message.updateMany({
        where: { metaMessageId },
        data: updateData,
      });
    }

    // Update Campaign Recipient record if this was a broadcast message
    await this.prisma.campaignRecipient.updateMany({
      where: {
        metaMessageId,
      },
      data: {
        status: mappedStatus,
        errorMessage,
      },
    });

    this.logger.log(`Updated status for message ${metaMessageId} -> ${mappedStatus} (readAt: ${updateData.readAt || 'none'}, deliveredAt: ${updateData.deliveredAt || 'none'})`);

    // Dynamic outbound webhook relay to external domains / systems
    if (targetOrgId) {
      try {
        await this.webhooksService.dispatchEvent(targetOrgId, 'message.status_update', {
          metaMessageId,
          status: mappedStatus,
          statusStr,
          timestamp,
          errorCode,
          errorMessage,
          recipientId: statusObj.recipient_id,
          rawMeta: statusObj,
        });
      } catch (err: any) {
        this.logger.warn(`External webhook relay failed for status_update: ${err.message}`);
      }
    }
  }

  private async handleInboundMessage(
    organizationId: string,
    phoneNumberRecordId: string,
    contactsMeta: any[] = [],
    msgObj: any,
  ) {
    const rawFrom = String(msgObj.from || '').replace(/^\+/, '');
    const fromPhone = `+${rawFrom}`;
    const metaMessageId = msgObj.id;
    const profileName = contactsMeta?.find((c) => String(c.wa_id).replace(/^\+/, '') === rawFrom)?.profile?.name || 'Customer';

    // 1. Resolve or create contact
    let contact = await this.prisma.contact.findUnique({
      where: {
        organizationId_phone: {
          organizationId,
          phone: fromPhone,
        },
      },
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          organizationId,
          phone: fromPhone,
          firstName: profileName !== 'Customer' ? profileName : fromPhone,
          leadStatus: LeadStatus.NEW,
          leadSource: 'WhatsApp Inbound',
        },
      });
    } else if (profileName && profileName !== 'Customer' && (!contact.firstName || contact.firstName === 'Recipient')) {
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          firstName: profileName,
          lastName: '',
        },
      });
    }

    // 2. Resolve or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
        phoneNumberId: phoneNumberRecordId,
      },
    });

    // 24 hours customer care service window
    const windowExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId,
          contactId: contact.id,
          phoneNumberId: phoneNumberRecordId,
          status: ConversationStatus.OPEN,
          unreadCount: 1,
          windowExpiresAt: windowExpiry,
          lastMessageAt: new Date(),
        },
      });
    } else {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: ConversationStatus.OPEN,
          unreadCount: { increment: 1 },
          windowExpiresAt: windowExpiry,
          lastMessageAt: new Date(),
        },
      });
    }

    // 3. Extract text content
    let messageBody = '';
    let messageType = MessageType.TEXT;

    if (msgObj.type === 'text') {
      messageBody = msgObj.text?.body || '';
    } else if (msgObj.type === 'interactive') {
      messageType = MessageType.INTERACTIVE;
      messageBody =
        msgObj.interactive?.button_reply?.title ||
        msgObj.interactive?.list_reply?.title ||
        '[Interactive Response]';
    } else if (['image', 'document', 'audio', 'video'].includes(msgObj.type)) {
      messageType = msgObj.type.toUpperCase() as MessageType;
      messageBody = `[Received ${msgObj.type}]`;
    }

    // 4. Create Message record (idempotent upsert by metaMessageId)
    const savedMsg = await this.prisma.message.upsert({
      where: { metaMessageId },
      update: {},
      create: {
        organizationId,
        conversationId: conversation.id,
        metaMessageId,
        direction: MessageDirection.INBOUND,
        type: messageType,
        body: messageBody,
        status: MessageStatus.DELIVERED,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    this.logger.log(`Created inbound message from ${fromPhone} in conversation ${conversation.id}`);

    // Dynamic outbound webhook relay to external domains / systems
    try {
      await this.webhooksService.dispatchEvent(organizationId, 'message.received', {
        messageId: savedMsg.id,
        metaMessageId,
        direction: 'INBOUND',
        from: fromPhone,
        profileName,
        type: messageType,
        body: messageBody,
        conversationId: conversation.id,
        timestamp: new Date(),
        rawMeta: msgObj,
      });
    } catch (err: any) {
      this.logger.warn(`External webhook relay failed for message.received: ${err.message}`);
    }

    // 5. Execute Active WhatsApp Bot Automation Flows on Inbound Message
    try {
      const botResult = await this.automationsService.handleInboundMessage({
        organizationId,
        conversationId: conversation.id,
        contactId: contact.id,
        contactPhone: fromPhone,
        contactName: contact.firstName || profileName,
        messageBody,
        phoneNumberRecordId,
        isNewLead: contact.createdAt.getTime() > Date.now() - 30000,
      });

      if (botResult?.executed) {
        this.logger.log(`WhatsApp Bot Flow "${botResult.flowName}" successfully replied to ${fromPhone}`);
      }
    } catch (botErr: any) {
      this.logger.error(`Automations Bot execution error: ${botErr.message}`, botErr.stack);
    }
  }
}
