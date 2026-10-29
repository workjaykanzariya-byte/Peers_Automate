import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from './meta-api.service';
import { ConnectWabaDto, SendTestMessageDto, UpdateWabaDto } from './dto/connect-waba.dto';
import { QualityRating, MetaIntegrationStatus, MessageDirection, MessageStatus, MessageType, ConversationStatus } from '@doot/shared';
import * as crypto from 'crypto';

@Injectable()
export class MetaAccountsService {
  private readonly logger = new Logger(MetaAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly metaApi: MetaApiService,
  ) {}

  async listAccounts(organizationId: string) {
    const integrations = await this.prisma.metaIntegration.findMany({
      where: { organizationId },
      include: {
        phoneNumbers: true,
        _count: {
          select: {
            whatsappTemplates: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enforce 1 active WhatsApp account per user/organization as requested
    const activeIntegrations = integrations.filter((i) => i.status === 'CONNECTED');
    const realWaba = activeIntegrations.find((i) => !i.wabaId.startsWith('waba_') && i.wabaId.length >= 10);
    const selectedIntegrations = realWaba
      ? [realWaba]
      : activeIntegrations.length > 0
      ? [activeIntegrations[0]]
      : integrations.slice(0, 1);

    const webhookEndpoints = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    const primaryEndpoint = webhookEndpoints[0] || null;

    return selectedIntegrations.map((item) => ({
      id: item.id,
      name: item.name,
      metaBusinessId: item.metaBusinessId,
      wabaId: item.wabaId,
      status: item.status,
      tokenKeyVersion: item.tokenKeyVersion,
      webhookVerifyToken: this.encryption.mask(item.webhookVerifyToken, 3),
      webhookEndpoint: primaryEndpoint ? {
        id: primaryEndpoint.id,
        name: primaryEndpoint.name,
        url: primaryEndpoint.url,
        secret: primaryEndpoint.secret,
        isActive: primaryEndpoint.isActive,
        events: primaryEndpoint.events,
      } : null,
      phoneNumbers: (
        item.phoneNumbers.filter(p => !p.phoneNumberId.startsWith('phone_test') && !p.phoneNumberId.startsWith('phone_qa')).length > 0
          ? item.phoneNumbers.filter(p => !p.phoneNumberId.startsWith('phone_test') && !p.phoneNumberId.startsWith('phone_qa')).slice(0, 1)
          : item.phoneNumbers.slice(0, 1)
      ).map((p) => ({
        id: p.id,
        phoneNumberId: p.phoneNumberId,
        displayPhoneNumber: p.displayPhoneNumber,
        verifiedName: p.verifiedName,
        qualityRating: p.qualityRating,
        messagingLimitTier: p.messagingLimitTier,
        isDefault: p.isDefault,
        status: p.status,
      })),
      templateCount: item._count.whatsappTemplates,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async connectWaba(organizationId: string, userId: string, dto: ConnectWabaDto) {
    // 1. Encrypt access token using AES-256-GCM
    const { ciphertext, keyVersion } = this.encryption.encrypt(dto.accessToken);

    // 2. Generate cryptographically random webhook verify token for tenant
    const webhookVerifyToken = `doot_${crypto.randomBytes(16).toString('hex')}`;

    return this.prisma.$transaction(async (tx) => {
      // Create or update Meta Integration
      const integration = await tx.metaIntegration.create({
        data: {
          organizationId,
          metaBusinessId: dto.metaBusinessId || `biz_${dto.wabaId}`,
          wabaId: dto.wabaId,
          name: dto.name,
          encryptedAccessToken: ciphertext,
          tokenKeyVersion: keyVersion,
          webhookVerifyToken,
          status: MetaIntegrationStatus.CONNECTED,
        },
      });

      // Register or update Phone Number
      const phone = await tx.phoneNumber.upsert({
        where: { phoneNumberId: dto.phoneNumberId },
        update: {
          displayPhoneNumber: dto.displayPhoneNumber,
          verifiedName: dto.verifiedName || 'Business Line',
          organizationId,
          metaIntegrationId: integration.id,
        },
        create: {
          organizationId,
          metaIntegrationId: integration.id,
          phoneNumberId: dto.phoneNumberId,
          displayPhoneNumber: dto.displayPhoneNumber,
          verifiedName: dto.verifiedName || 'Business Line',
          qualityRating: QualityRating.GREEN,
          messagingLimitTier: 'TIER_10K',
          isDefault: true,
        },
      });

      // Security Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'CONNECT_WHATSAPP_ACCOUNT',
          resource: 'meta_integration',
          resourceId: integration.id,
          metadata: {
            wabaId: dto.wabaId,
            phoneNumberId: dto.phoneNumberId,
            displayPhone: dto.displayPhoneNumber,
          },
        },
      });

      return {
        message: 'WhatsApp Business Account successfully connected and assets registered',
        integrationId: integration.id,
        wabaId: integration.wabaId,
        phoneNumberId: phone.phoneNumberId,
        displayPhoneNumber: phone.displayPhoneNumber,
      };
    });
  }

  async updateAccount(
    organizationId: string,
    userId: string,
    integrationId: string,
    dto: UpdateWabaDto,
  ) {
    const integration = await this.prisma.metaIntegration.findFirst({
      where: {
        id: integrationId,
        organizationId,
      },
      include: { phoneNumbers: true },
    });

    if (!integration) {
      throw new NotFoundException(`Meta Integration with ID ${integrationId} not found`);
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.wabaId) updateData.wabaId = dto.wabaId;
    if (dto.metaBusinessId) updateData.metaBusinessId = dto.metaBusinessId;

    if (dto.accessToken && dto.accessToken.trim().length > 10) {
      const { ciphertext, keyVersion } = this.encryption.encrypt(dto.accessToken.trim());
      updateData.encryptedAccessToken = ciphertext;
      updateData.tokenKeyVersion = keyVersion;
      updateData.status = MetaIntegrationStatus.CONNECTED;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedIntegration = await tx.metaIntegration.update({
        where: { id: integration.id },
        data: updateData,
      });

      if (dto.phoneNumberId || dto.displayPhoneNumber || dto.verifiedName) {
        const existingPhone = integration.phoneNumbers[0];
        if (existingPhone) {
          await tx.phoneNumber.update({
            where: { id: existingPhone.id },
            data: {
              ...(dto.phoneNumberId ? { phoneNumberId: dto.phoneNumberId } : {}),
              ...(dto.displayPhoneNumber ? { displayPhoneNumber: dto.displayPhoneNumber } : {}),
              ...(dto.verifiedName ? { verifiedName: dto.verifiedName } : {}),
            },
          });
        }
      }

      // 3. Update or create external outbound relay webhook if provided
      if (dto.externalWebhookUrl !== undefined) {
        const existingEp = await tx.webhookEndpoint.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        });
        if (dto.externalWebhookUrl.trim()) {
          if (existingEp) {
            await tx.webhookEndpoint.update({
              where: { id: existingEp.id },
              data: {
                url: dto.externalWebhookUrl.trim(),
                secret: dto.externalWebhookToken?.trim() || existingEp.secret,
                isActive: dto.isWebhookActive !== undefined ? dto.isWebhookActive : true,
                updatedAt: new Date(),
              },
            });
          } else {
            await tx.webhookEndpoint.create({
              data: {
                organizationId,
                name: `${dto.name || 'WhatsApp'} External Relay`,
                url: dto.externalWebhookUrl.trim(),
                secret: dto.externalWebhookToken?.trim() || 'unity_whatsapp_webhook_verify_token_2026',
                events: ['message.received', 'message.status_update'],
                isActive: dto.isWebhookActive !== undefined ? dto.isWebhookActive : true,
              },
            });
          }
        } else if (existingEp && dto.externalWebhookUrl === '') {
          await tx.webhookEndpoint.update({
            where: { id: existingEp.id },
            data: { isActive: false, updatedAt: new Date() },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'UPDATE_WHATSAPP_ACCOUNT',
          resource: 'meta_integration',
          resourceId: integration.id,
          metadata: {
            wabaId: dto.wabaId || integration.wabaId,
            phoneNumberId: dto.phoneNumberId,
            displayPhone: dto.displayPhoneNumber,
          },
        },
      });

      return {
        message: 'WhatsApp connection details successfully updated',
        integrationId: updatedIntegration.id,
        wabaId: updatedIntegration.wabaId,
      };
    });
  }

  async sendTestMessage(organizationId: string, userId: string, dto: SendTestMessageDto) {
    const recipient = dto.recipientPhone || dto.recipient;
    if (!recipient) {
      throw new BadRequestException('Recipient phone number is required');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.phoneNumberId);
    const phone = await this.prisma.phoneNumber.findFirst({
      where: {
        organizationId,
        ...(isUuid ? { OR: [{ id: dto.phoneNumberId }, { phoneNumberId: dto.phoneNumberId }] } : { phoneNumberId: dto.phoneNumberId }),
      },
      include: {
        metaIntegration: true,
      },
    });

    if (!phone) {
      throw new NotFoundException('Specified WhatsApp phone number not found in this organization');
    }

    // Decrypt provider access token
    const plaintextToken = this.encryption.decrypt(phone.metaIntegration.encryptedAccessToken);

    let messageId = `wamid.test_${Date.now()}`;

    // If templateName is provided, dispatch approved Meta template message!
    if (dto.templateName) {
      const components: any[] = [];

      // Header component if media (IMAGE, VIDEO, DOCUMENT)
      if (dto.headerType && dto.headerType !== 'TEXT') {
        const mediaFormat = dto.headerType.toLowerCase(); // image, video, document
        let resolvedMediaId = dto.mediaId;

        // 1. If base64 file data was sent from browser, upload directly to Meta WhatsApp Cloud media storage
        if (!resolvedMediaId && dto.mediaBase64) {
          try {
            const matches = dto.mediaBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
              const mime = matches[1];
              const buffer = Buffer.from(matches[2], 'base64');
              const ext = mime.split('/')[1] || 'bin';
              const uploadRes = await this.metaApi.uploadMedia(
                phone.phoneNumberId,
                plaintextToken,
                buffer,
                mime,
                `whatsapp_asset_${Date.now()}.${ext}`,
              );
              resolvedMediaId = uploadRes.id;
            }
          } catch (uploadErr: any) {
            this.logger.error(`Failed to upload mediaBase64 to Meta: ${uploadErr.message}`);
            throw new BadRequestException(`Media Upload Failed: ${uploadErr.message}`);
          }
        }

        if (resolvedMediaId) {
          // Send with Meta Media ID
          components.push({
            type: 'header',
            parameters: [
              {
                type: mediaFormat,
                [mediaFormat]: { id: resolvedMediaId },
              },
            ],
          });
        } else if (
          dto.mediaUrl &&
          dto.mediaUrl.startsWith('http') &&
          !dto.mediaUrl.includes('localhost') &&
          !dto.mediaUrl.startsWith('blob:')
        ) {
          // Send with Public HTTPS URL
          components.push({
            type: 'header',
            parameters: [
              {
                type: mediaFormat,
                [mediaFormat]: { link: dto.mediaUrl },
              },
            ],
          });
        } else {
          // Fallback: check if the template in the database already has an approved sample handle URL
          const template = await this.prisma.whatsAppTemplate.findFirst({
            where: {
              organizationId,
              name: dto.templateName,
            },
          });
          const comps = (template?.components as any[]) || [];
          const header = comps.find((c) => c.type === 'HEADER');
          const sampleHandle = header?.example?.header_handle?.[0];

          if (sampleHandle && sampleHandle.startsWith('http')) {
            components.push({
              type: 'header',
              parameters: [
                {
                  type: mediaFormat,
                  [mediaFormat]: { link: sampleHandle },
                },
              ],
            });
          } else {
            throw new BadRequestException(
              `Please upload a valid ${dto.headerType} file or provide a public HTTPS image URL. (Local browser blob URLs cannot be accessed by Meta's Cloud servers)`,
            );
          }
        }
      }

      // Body component parameters
      if (dto.variables && Object.keys(dto.variables).length > 0) {
        const sortedKeys = Object.keys(dto.variables).sort((a, b) => Number(a) - Number(b));
        components.push({
          type: 'body',
          parameters: sortedKeys.map((k) => ({
            type: 'text',
            text: dto.variables![k] || '',
          })),
        });
      }

      const result = await this.metaApi.sendTemplateMessage(
        phone.phoneNumberId,
        plaintextToken,
        recipient,
        dto.templateName,
        dto.languageCode || 'en_US',
        components,
      );
      messageId = result?.messages?.[0]?.id || messageId;
    } else {
      // Freeform text message
      const testBody = dto.text || `Hello! This is a real diagnostic verification message from DOOT WhatsApp SaaS for ${phone.verifiedName || 'your business'}. Integration verified successfully at ${new Date().toUTCString()}.`;

      const result = await this.metaApi.sendTextMessage(
        phone.phoneNumberId,
        plaintextToken,
        recipient,
        testBody,
      );
      messageId = result?.messages?.[0]?.id || messageId;
    }

    // Persist Message and Conversation record so it is visible in Message Logs and tracks status webhooks
    try {
      const cleanPhone = recipient.startsWith('+') ? recipient : `+${recipient.replace(/[^0-9]/g, '')}`;
      const rawName = (dto.variables?.['1'] || (dto as any).recipientName || '').trim();
      const first = rawName ? rawName.split(' ')[0] : '';
      const last = rawName ? rawName.split(' ').slice(1).join(' ') : '';

      let contact = await this.prisma.contact.findUnique({
        where: { organizationId_phone: { organizationId, phone: cleanPhone } },
      });
      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            organizationId,
            phone: cleanPhone,
            firstName: first || cleanPhone,
            lastName: last || '',
            leadSource: 'TEST_DISPATCH',
          },
        });
      } else if (first && (!contact.firstName || contact.firstName === 'Recipient')) {
        contact = await this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            firstName: first,
            lastName: last || '',
          },
        });
      }

      let conv = await this.prisma.conversation.findFirst({
        where: { organizationId, contactId: contact.id },
      });
      if (!conv) {
        conv = await this.prisma.conversation.create({
          data: {
            organizationId,
            contactId: contact.id,
            phoneNumberId: phone.id,
            status: ConversationStatus.OPEN,
            lastMessageAt: new Date(),
          },
        });
      } else {
        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date(), phoneNumberId: phone.id },
        });
      }

      const bodyText = dto.templateName
        ? `Template: ${dto.templateName}`
        : (dto.text || 'Diagnostic test message');

      await this.prisma.message.create({
        data: {
          organizationId,
          conversationId: conv.id,
          metaMessageId: messageId,
          direction: MessageDirection.OUTBOUND,
          type: dto.templateName ? MessageType.TEMPLATE : MessageType.TEXT,
          body: bodyText,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (saveErr: any) {
      this.logger.warn(`Failed to persist test message record: ${saveErr.message}`);
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'SEND_TEST_WHATSAPP_MESSAGE',
        resource: 'phone_number',
        resourceId: phone.id,
        metadata: {
          recipientPhone: recipient,
          templateName: dto.templateName || null,
          messageId,
        },
      },
    });

    return {
      success: true,
      messageId,
      recipientPhone: recipient,
      status: 'SUBMITTED',
      timestamp: new Date().toISOString(),
    };
  }

  async disconnectAccount(organizationId: string, userId: string, integrationId: string) {
    const integration = await this.prisma.metaIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('WhatsApp integration not found');
    }

    await this.prisma.metaIntegration.delete({
      where: { id: integration.id },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'DISCONNECT_WHATSAPP_ACCOUNT',
        resource: 'meta_integration',
        resourceId: integrationId,
        metadata: { wabaId: integration.wabaId },
      },
    });

    return { message: 'WhatsApp integration successfully removed' };
  }
}
