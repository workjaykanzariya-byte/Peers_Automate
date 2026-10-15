import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from '../meta/meta-api.service';
import { ConversationStatus, MessageDirection, MessageStatus, MessageType } from '@doot/shared';

export interface SendMessageDto {
  body?: string;
  type?: MessageType;
  templateId?: string;
  templateParameters?: Record<string, string>;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly metaApi: MetaApiService,
  ) {}

  async listConversations(
    organizationId: string,
    query: { status?: ConversationStatus; search?: string; assignedUserId?: string },
  ) {
    const where: any = { organizationId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedUserId) {
      where.assignedUserId = query.assignedUserId;
    }

    if (query.search) {
      const s = query.search.trim();
      where.contact = {
        OR: [
          { phone: { contains: s, mode: 'insensitive' } },
          { firstName: { contains: s, mode: 'insensitive' } },
          { lastName: { contains: s, mode: 'insensitive' } },
          { companyName: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
          },
        },
        phoneNumber: {
          select: { id: true, displayPhoneNumber: true, verifiedName: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const now = Date.now();

    return conversations.map((conv) => {
      const lastMsg = conv.messages[0] || null;
      const isWindowActive = conv.windowExpiresAt ? conv.windowExpiresAt.getTime() > now : false;
      const windowRemainingMinutes = isWindowActive && conv.windowExpiresAt
        ? Math.max(0, Math.round((conv.windowExpiresAt.getTime() - now) / 60000))
        : 0;

      return {
        id: conv.id,
        contact: {
          id: conv.contact.id,
          phone: conv.contact.phone,
          firstName: conv.contact.firstName,
          lastName: conv.contact.lastName,
          fullName: `${conv.contact.firstName || ''} ${conv.contact.lastName || ''}`.trim() || conv.contact.phone,
          companyName: conv.contact.companyName,
          leadStatus: conv.contact.leadStatus,
          tags: conv.contact.tags.map((t) => t.tag.name),
        },
        phoneNumber: conv.phoneNumber,
        assignedUser: conv.assignedUser,
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              direction: lastMsg.direction,
              status: lastMsg.status,
              createdAt: lastMsg.createdAt,
            }
          : null,
        isWindowActive,
        windowRemainingMinutes,
        windowExpiresAt: conv.windowExpiresAt,
        lastMessageAt: conv.lastMessageAt,
      };
    });
  }

  async getConversation(organizationId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
            groupMemberships: { include: { group: true } },
            assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        phoneNumber: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    // Reset unread count on view
    if (conv.unreadCount > 0) {
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { unreadCount: 0 },
      });
      conv.unreadCount = 0;
    }

    const now = Date.now();
    const isWindowActive = conv.windowExpiresAt ? conv.windowExpiresAt.getTime() > now : false;
    const windowRemainingMinutes = isWindowActive && conv.windowExpiresAt
      ? Math.max(0, Math.round((conv.windowExpiresAt.getTime() - now) / 60000))
      : 0;

    return {
      id: conv.id,
      contact: conv.contact,
      phoneNumber: conv.phoneNumber,
      assignedUser: conv.assignedUser,
      status: conv.status,
      unreadCount: conv.unreadCount,
      isWindowActive,
      windowRemainingMinutes,
      windowExpiresAt: conv.windowExpiresAt,
      lastMessageAt: conv.lastMessageAt,
      messages: conv.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        type: m.type,
        body: m.body,
        mediaUrl: m.mediaUrl,
        status: m.status,
        errorCode: m.errorCode,
        errorMessage: m.errorMessage,
        createdAt: m.createdAt,
      })),
    };
  }

  async sendMessage(organizationId: string, userId: string, conversationId: string, dto: SendMessageDto) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: {
        contact: true,
        phoneNumber: {
          include: { metaIntegration: true },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const now = Date.now();
    const isWindowActive = conv.windowExpiresAt ? conv.windowExpiresAt.getTime() > now : false;

    // Decrypt access token
    const plaintextToken = this.encryption.decrypt(conv.phoneNumber.metaIntegration.encryptedAccessToken);

    let messageId = `wamid.out_${Date.now()}`;
    let messageBody = dto.body || '';

    // Enforce 24-hour customer care window per Meta official policy
    if (!isWindowActive) {
      if (!dto.templateId) {
        throw new BadRequestException(
          'The 24-hour customer service window has expired. Meta policy requires sending an approved WhatsApp Template message to re-initiate communication.',
        );
      }

      const template = await this.prisma.whatsAppTemplate.findFirst({
        where: { id: dto.templateId, organizationId, status: 'APPROVED' },
      });

      if (!template) {
        throw new BadRequestException('Selected approved template was not found');
      }

      // Format template message components
      const components: any[] = [];
      const bodyComp = (template.components as any[])?.find((c) => c.type === 'BODY');
      let renderedBody = bodyComp?.text || template.name;

      if (dto.templateParameters) {
        const parameters = Object.entries(dto.templateParameters).map(([key, val]) => {
          renderedBody = renderedBody.replace(`{{${key}}}`, val);
          return { type: 'text', text: val };
        });
        components.push({ type: 'body', parameters });
      }

      messageBody = renderedBody;

      const metaRes = await this.metaApi.sendTemplateMessage(
        conv.phoneNumber.phoneNumberId,
        plaintextToken,
        conv.contact.phone,
        template.name,
        template.language,
        components,
      );
      if (metaRes?.messages?.[0]?.id) {
        messageId = metaRes.messages[0].id;
      }
    } else {
      // Inside active 24h window: freeform text supported
      if (!dto.body) {
        throw new BadRequestException('Message body cannot be empty');
      }

      const metaRes = await this.metaApi.sendTextMessage(
        conv.phoneNumber.phoneNumberId,
        plaintextToken,
        conv.contact.phone,
        dto.body,
      );
      if (metaRes?.messages?.[0]?.id) {
        messageId = metaRes.messages[0].id;
      }
    }

    // Record outbound message in database
    const message = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId: conv.id,
        metaMessageId: messageId,
        direction: MessageDirection.OUTBOUND,
        type: dto.templateId ? MessageType.TEMPLATE : MessageType.TEXT,
        body: messageBody,
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Update conversation last message timestamp
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async updateConversation(
    organizationId: string,
    id: string,
    update: { status?: ConversationStatus; assignedUserId?: string | null },
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id: conv.id },
      data: {
        status: update.status !== undefined ? update.status : conv.status,
        assignedUserId: update.assignedUserId !== undefined ? update.assignedUserId : conv.assignedUserId,
      },
    });
  }
}
