import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ConnectMessengerPageDto {
  pageId: string;
  pageName: string;
  pageToken: string;
  subscribedFields?: string[];
}

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  async listPages(organizationId: string) {
    const pages = await this.prisma.messengerIntegration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return pages.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      pageName: p.pageName,
      status: p.status,
      subscribedFields: p.subscribedFields,
      createdAt: p.createdAt,
    }));
  }

  async connectPage(organizationId: string, dto: ConnectMessengerPageDto) {
    if (!dto.pageId || !dto.pageToken) {
      throw new BadRequestException('Facebook Page ID and Page Access Token are required');
    }

    const encryptedToken = this.encryption.encrypt(dto.pageToken).ciphertext;

    return this.prisma.messengerIntegration.upsert({
      where: {
        organizationId_pageId: {
          organizationId,
          pageId: dto.pageId,
        },
      },
      update: {
        pageName: dto.pageName || 'Facebook Page',
        encryptedPageToken: encryptedToken,
        status: 'CONNECTED',
        subscribedFields: dto.subscribedFields || ['messages', 'messaging_postbacks'],
      },
      create: {
        organizationId,
        pageId: dto.pageId,
        pageName: dto.pageName || 'Facebook Page',
        encryptedPageToken: encryptedToken,
        status: 'CONNECTED',
        subscribedFields: dto.subscribedFields || ['messages', 'messaging_postbacks'],
      },
    });
  }

  /**
   * Official Meta Messenger Webhook verification handshake
   */
  verifyWebhookHandshake(mode: string, token: string, challenge: string): string {
    const verifyToken = this.configService.get<string>(
      'MESSENGER_VERIFY_TOKEN',
      'doot_messenger_verify_token_default',
    );

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Messenger webhook verified successfully');
      return challenge;
    }

    throw new BadRequestException('Invalid Messenger webhook verification token');
  }

  /**
   * Process incoming Messenger messages
   */
  async processWebhookEvent(rawPayload: Buffer | string, signatureHeader?: string) {
    const appSecret = this.configService.get<string>('META_APP_SECRET', 'test_app_secret');

    // Signature verification
    if (signatureHeader && signatureHeader.startsWith('sha256=') && appSecret !== 'test_app_secret') {
      const signature = signatureHeader.replace('sha256=', '');
      const expected = crypto
        .createHmac('sha256', appSecret)
        .update(rawPayload)
        .digest('hex');

      if (signature !== expected) {
        throw new BadRequestException('Invalid Messenger webhook signature');
      }
    }

    const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : JSON.parse(rawPayload.toString('utf8'));
    this.logger.log(`Received Messenger Webhook payload: object=${payload.object}`);

    return { received: true };
  }
}
