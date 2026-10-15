import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaWebhookService } from './meta-webhook.service';
import * as crypto from 'crypto';

describe('MetaWebhookService Verification & Signature Security', () => {
  let webhookService: MetaWebhookService;
  let mockPrisma: any;
  let mockConfig: any;
  const APP_SECRET = 'meta_app_secret_test_2026';
  const VERIFY_TOKEN = 'doot_meta_verify_token_2026';

  beforeEach(() => {
    mockPrisma = {
      metaAccount: { findFirst: jest.fn() },
      phoneNumber: { findFirst: jest.fn() },
      contact: { findFirst: jest.fn(), create: jest.fn() },
      conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      message: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'META_APP_SECRET') return APP_SECRET;
        if (key === 'META_WEBHOOK_VERIFY_TOKEN') return VERIFY_TOKEN;
        return null;
      }),
    };

    webhookService = new MetaWebhookService(
      mockPrisma as any,
      mockConfig as unknown as ConfigService,
    );
  });

  describe('Meta Subscription Challenge Handshake', () => {
    it('returns hub.challenge when mode is subscribe and token matches', () => {
      const challenge = '1158201444';
      const result = webhookService.verifyHandshake('subscribe', VERIFY_TOKEN, challenge);
      expect(result).toBe(challenge);
    });

    it('throws UnauthorizedException when token does not match', () => {
      expect(() =>
        webhookService.verifyHandshake('subscribe', 'wrong_token', '1158201444'),
      ).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when mode is not subscribe', () => {
      expect(() =>
        webhookService.verifyHandshake('invalid_mode', VERIFY_TOKEN, '1158201444'),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('Meta X-Hub-Signature-256 HMAC Verification', () => {
    it('verifies valid HMAC-SHA256 signature generated with app secret', () => {
      const rawPayload = Buffer.from(
        JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
      );
      const hmac = crypto.createHmac('sha256', APP_SECRET).update(rawPayload).digest('hex');
      const validHeader = `sha256=${hmac}`;

      const isValid = webhookService.validateSignature(rawPayload, validHeader);
      expect(isValid).toBe(true);
    });

    it('rejects tampered raw payload', () => {
      const originalPayload = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
      const tamperedPayload = Buffer.from(JSON.stringify({ object: 'hacked_account' }));
      const hmac = crypto.createHmac('sha256', APP_SECRET).update(originalPayload).digest('hex');
      const header = `sha256=${hmac}`;

      const isValid = webhookService.validateSignature(tamperedPayload, header);
      expect(isValid).toBe(false);
    });

    it('rejects missing or malformed signature header', () => {
      const payload = Buffer.from('test');
      expect(webhookService.validateSignature(payload, '')).toBe(false);
      expect(webhookService.validateSignature(payload, 'sha1=12345')).toBe(false);
      expect(webhookService.validateSignature(payload, 'invalid_header')).toBe(false);
    });
  });
});
