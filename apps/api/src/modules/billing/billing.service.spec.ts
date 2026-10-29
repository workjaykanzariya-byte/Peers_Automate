import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: any;
  let mockConfig: any;
  const webhookSecret = 'test_webhook_signing_secret_2026';

  beforeEach(() => {
    mockPrisma = {
      plan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'BILLING_WEBHOOK_SECRET') return webhookSecret;
        return defaultValue;
      }),
    };
    const mockEncryption = {
      encrypt: jest.fn().mockReturnValue({ ciphertext: 'mock_encrypted', keyVersion: 'v1' }),
      decrypt: jest.fn().mockReturnValue('mock_decrypted_secret'),
    };
    service = new BillingService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
      mockEncryption as any,
    );
  });

  describe('handlePaymentWebhook', () => {
    it('should reject webhook with invalid signature when secret is configured', async () => {
      const payload = JSON.stringify({ eventType: 'payment.succeeded' });
      await expect(
        service.handlePaymentWebhook(payload, 'invalid_hex_digest'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully verify valid HMAC-SHA256 signature and process payment', async () => {
      const payloadObj = {
        eventType: 'payment.succeeded',
        organizationId: 'org-test-1',
        planTier: 'GROWTH',
        amount: 79,
        invoiceNumber: 'INV-2026-0001',
      };

      const payloadString = JSON.stringify(payloadObj);
      const validHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      mockPrisma.plan.findFirst.mockResolvedValue({
        id: 'plan-growth',
        tier: 'GROWTH',
        monthlyPrice: 79,
      });
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: 'sub-test',
        organizationId: 'org-test-1',
        planId: 'plan-growth',
        status: 'ACTIVE',
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-test',
        invoiceNumber: 'INV-2026-0001',
        status: 'PAID',
      });

      const response = await service.handlePaymentWebhook(payloadString, validHmac);
      expect(response.received).toBe(true);
      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });
  });
});
