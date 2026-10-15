import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MessageDirection, MessageStatus, MessageType, ConversationStatus, LeadStatus } from '@doot/shared';
import * as crypto from 'crypto';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Official Meta Webhook verification handshake
   */
  verifyHandshake(mode: string, verifyToken: string, challenge: string): string {
    const configuredToken = this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN', 'doot_webhook_verify_token_default');

    if (mode === 'subscribe' && verifyToken) {
      const isMatch =
        verifyToken.length === configuredToken.length &&
        crypto.timingSafeEqual(Buffer.from(verifyToken), Buffer.from(configuredToken));

      if (isMatch) {
        this.logger.log('Meta webhook challenge verified successfully');
        return challenge;
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

          // 1. Resolve organization by phone_number_id
          const phone = await this.prisma.phoneNumber.findUnique({
            where: { phoneNumberId },
            include: { organization: true },
          });

          if (!phone) {
            this.logger.warn(`Received webhook for unknown phone_number_id: ${phoneNumberId}`);
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
            for (const msgObj of value.messages) {
              await this.handleInboundMessage(orgId, phone.id, value.contacts, msgObj);
            }
          }
        }
      }
    }

    return { status: 'PROCESSED' };
  }

  private async handleStatusUpdate(organizationId: string, statusObj: any) {
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

    // Update Message record
    await this.prisma.message.updateMany({
      where: {
        organizationId,
        metaMessageId,
      },
      data: {
        status: mappedStatus,
        deliveredAt: mappedStatus === MessageStatus.DELIVERED ? timestamp : undefined,
        readAt: mappedStatus === MessageStatus.READ ? timestamp : undefined,
        errorCode,
        errorMessage,
      },
    });

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

    this.logger.log(`Updated status for message ${metaMessageId} -> ${mappedStatus}`);
  }

  private async handleInboundMessage(
    organizationId: string,
    phoneNumberRecordId: string,
    contactsMeta: any[] = [],
    msgObj: any,
  ) {
    const fromPhone = `+${msgObj.from}`;
    const metaMessageId = msgObj.id;
    const profileName = contactsMeta?.find((c) => c.wa_id === msgObj.from)?.profile?.name || 'Customer';

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
          firstName: profileName,
          leadStatus: LeadStatus.NEW,
          leadSource: 'WhatsApp Inbound',
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
    await this.prisma.message.upsert({
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
      },
    });

    this.logger.log(`Created inbound message from ${fromPhone} in conversation ${conversation.id}`);
  }
}
