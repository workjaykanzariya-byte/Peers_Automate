import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from './meta-api.service';
import { ConnectWabaDto, SendTestMessageDto } from './dto/connect-waba.dto';
import { QualityRating, MetaIntegrationStatus } from '@doot/shared';
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

    return integrations.map((item) => ({
      id: item.id,
      name: item.name,
      metaBusinessId: item.metaBusinessId,
      wabaId: item.wabaId,
      status: item.status,
      tokenKeyVersion: item.tokenKeyVersion,
      webhookVerifyToken: this.encryption.mask(item.webhookVerifyToken, 3),
      phoneNumbers: item.phoneNumbers.map((p) => ({
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
          metaBusinessId: dto.metaBusinessId,
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

  async sendTestMessage(organizationId: string, userId: string, dto: SendTestMessageDto) {
    const phone = await this.prisma.phoneNumber.findFirst({
      where: {
        phoneNumberId: dto.phoneNumberId,
        organizationId,
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

    const testBody = `Hello! This is a real diagnostic verification message from DOOT WhatsApp SaaS for ${phone.verifiedName || 'your business'}. Integration verified successfully at ${new Date().toUTCString()}.`;

    const result = await this.metaApi.sendTextMessage(
      phone.phoneNumberId,
      plaintextToken,
      dto.recipientPhone,
      testBody,
    );

    const messageId = result?.messages?.[0]?.id || `wamid.test_${Date.now()}`;

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'SEND_TEST_WHATSAPP_MESSAGE',
        resource: 'phone_number',
        resourceId: phone.id,
        metadata: {
          recipientPhone: dto.recipientPhone,
          messageId,
        },
      },
    });

    return {
      success: true,
      messageId,
      recipientPhone: dto.recipientPhone,
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
