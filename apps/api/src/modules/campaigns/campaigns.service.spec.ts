import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignStatus, TemplateStatus } from '@doot/shared';

describe('CampaignsService — Eligibility, Opt-outs, and Template Validation', () => {
  let campaignsService: CampaignsService;
  let mockPrisma: any;
  let mockEncryption: any;
  let mockMetaApi: any;
  let mockQueueService: any;

  beforeEach(() => {
    mockPrisma = {
      phoneNumber: { findFirst: jest.fn() },
      whatsAppTemplate: { findFirst: jest.fn() },
      campaign: { create: jest.fn(), findFirst: jest.fn() },
      contact: { findMany: jest.fn() },
      campaignRecipient: { create: jest.fn().mockResolvedValue({ id: 'cr-1' }), createMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockEncryption = {
      decrypt: jest.fn().mockReturnValue('decrypted_token'),
    };

    mockMetaApi = {
      sendTemplateMessage: jest.fn(),
    };

    mockQueueService = {
      addJob: jest.fn().mockResolvedValue('job-123'),
    };

    campaignsService = new CampaignsService(
      mockPrisma as any,
      mockEncryption as any,
      mockMetaApi as any,
      mockQueueService as any,
    );
  });

  it('STRICTLY REJECTS unapproved or pending templates when creating campaign', async () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    mockPrisma.phoneNumber.findFirst.mockResolvedValue({ id: 'p1', metaIntegration: { encryptedAccessToken: 'enc' } });
    mockPrisma.whatsAppTemplate.findFirst.mockResolvedValue({
      id: 'tpl-unapproved',
      name: 'draft_promo',
      status: TemplateStatus.PENDING, // Not APPROVED
    });

    await expect(
      campaignsService.createCampaign(orgId, userId, {
        name: 'Flash Sale',
        phoneNumberId: 'p1',
        templateId: 'tpl-unapproved',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Cannot launch campaign with template status "PENDING". Template must be APPROVED by Meta.',
      ),
    );
  });

  it('AUTOMATICALLY FILTERS OUT contacts who have opted out (optedOutAt is not null)', async () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    mockPrisma.phoneNumber.findFirst.mockResolvedValue({ id: 'p1', metaIntegration: { encryptedAccessToken: 'enc' } });
    mockPrisma.whatsAppTemplate.findFirst.mockResolvedValue({
      id: 'tpl-approved',
      name: 'monthly_newsletter',
      status: TemplateStatus.APPROVED,
    });

    // Mock contacts query: contacts returned must have optedOutAt: null
    mockPrisma.contact.findMany.mockImplementation((args: any) => {
      // Verify prisma query enforces optedOutAt: null and isBlocked: false
      expect(args.where.optedOutAt).toBeNull();
      expect(args.where.isBlocked).toBe(false);
      return Promise.resolve([
        { id: 'c1', phone: '+919876543210' },
        { id: 'c2', phone: '+919876543211' },
      ]);
    });

    mockPrisma.campaign.create.mockResolvedValue({
      id: 'camp-1',
      name: 'Audience Test',
      status: CampaignStatus.QUEUED,
      totalRecipients: 2,
    });

    mockPrisma.campaignRecipient.createMany.mockResolvedValue({ count: 2 });

    const result = await campaignsService.createCampaign(orgId, userId, {
      name: 'Audience Test',
      phoneNumberId: 'p1',
      templateId: 'tpl-approved',
      executeImmediately: true,
    });

    expect(result).toBeDefined();
    expect(mockPrisma.contact.findMany).toHaveBeenCalled();
    expect(mockQueueService.addJob).toHaveBeenCalledWith(
      'campaign-dispatch',
      'dispatch-campaign',
      { campaignId: 'camp-1', organizationId: orgId },
      'camp_camp-1',
    );
  });
});
