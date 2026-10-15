import { BadRequestException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

describe('ConversationsService — 24-Hour WhatsApp Service Window Compliance', () => {
  let conversationsService: ConversationsService;
  let mockPrisma: any;
  let mockMetaApi: any;
  let mockEncryption: any;

  beforeEach(() => {
    mockPrisma = {
      conversation: { findFirst: jest.fn(), update: jest.fn() },
      whatsAppTemplate: { findFirst: jest.fn() },
      message: { create: jest.fn() },
    };

    mockMetaApi = {
      sendTextMessage: jest.fn(),
      sendTemplateMessage: jest.fn(),
    };

    mockEncryption = {
      decrypt: jest.fn().mockReturnValue('decrypted_token'),
    };

    conversationsService = new ConversationsService(
      mockPrisma as any,
      mockEncryption as any,
      mockMetaApi as any,
    );
  });

  it('ALLOWS freeform text message when 24-hour customer window is active', async () => {
    const orgId = 'org-123';
    const userId = 'user-1';
    const convId = 'conv-456';
    const futureWindow = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours remaining

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: convId,
      organizationId: orgId,
      windowExpiresAt: futureWindow,
      contact: { phone: '+919876543210' },
      phoneNumber: { id: 'phone-1', phoneNumberId: 'meta-phone-1', metaIntegration: { encryptedAccessToken: 'enc' } },
    });

    mockMetaApi.sendTextMessage.mockResolvedValue({
      messages: [{ id: 'wamid.HBgL...1' }],
    });

    mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });

    const result = await conversationsService.sendMessage(orgId, userId, convId, {
      body: 'Hello, how can we assist you today?',
    });

    expect(result).toBeDefined();
    expect(mockMetaApi.sendTextMessage).toHaveBeenCalledWith(
      'meta-phone-1',
      'decrypted_token',
      '+919876543210',
      'Hello, how can we assist you today?',
    );
  });

  it('STRICTLY BLOCKS freeform text message when 24-hour customer window has expired', async () => {
    const orgId = 'org-123';
    const userId = 'user-1';
    const convId = 'conv-456';
    const expiredWindow = new Date(Date.now() - 2 * 60 * 60 * 1000); // Expired 2 hours ago

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: convId,
      organizationId: orgId,
      windowExpiresAt: expiredWindow,
      contact: { phone: '+919876543210' },
      phoneNumber: { id: 'phone-1', metaIntegration: { encryptedAccessToken: 'enc' } },
    });

    await expect(
      conversationsService.sendMessage(orgId, userId, convId, {
        body: 'Hey are you still interested?',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'The 24-hour customer service window has expired. Meta policy requires sending an approved WhatsApp Template message to re-initiate communication.',
      ),
    );

    expect(mockMetaApi.sendTextMessage).not.toHaveBeenCalled();
  });

  it('ALLOWS approved template messages even after the 24-hour window has expired', async () => {
    const orgId = 'org-123';
    const userId = 'user-1';
    const convId = 'conv-456';
    const expiredWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired 24h ago

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: convId,
      organizationId: orgId,
      windowExpiresAt: expiredWindow,
      contact: { phone: '+919876543210' },
      phoneNumber: { id: 'phone-1', phoneNumberId: 'meta-phone-1', metaIntegration: { encryptedAccessToken: 'enc' } },
    });

    mockPrisma.whatsAppTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      name: 'reengagement_offer',
      status: 'APPROVED',
      language: 'en_US',
    });

    mockMetaApi.sendTemplateMessage.mockResolvedValue({
      messages: [{ id: 'wamid.HBgL...2' }],
    });

    mockPrisma.message.create.mockResolvedValue({ id: 'msg-2' });

    const result = await conversationsService.sendMessage(orgId, userId, convId, {
      templateId: 'tpl-1',
    });

    expect(result).toBeDefined();
    expect(mockMetaApi.sendTemplateMessage).toHaveBeenCalled();
  });
});
