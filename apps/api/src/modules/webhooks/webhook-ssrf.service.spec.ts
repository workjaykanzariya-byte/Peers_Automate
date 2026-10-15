import { BadRequestException } from '@nestjs/common';
import { WebhookSsrfService } from './webhook-ssrf.service';

describe('WebhookSsrfService Security Defenses', () => {
  let ssrfService: WebhookSsrfService;

  beforeEach(() => {
    ssrfService = new WebhookSsrfService();
  });

  describe('Protocol and Destination Verification', () => {
    it('ALLOWS public valid HTTPS webhook endpoints', async () => {
      // Mocking resolveIp to return a public IP
      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['104.21.45.12']);

      await expect(
        ssrfService.validateUrl('https://hooks.zapier.com/hooks/catch/123/abc'),
      ).resolves.not.toThrow();
    });

    it('STRICTLY BLOCKS non-HTTP(S) protocols (file, ftp, gopher)', async () => {
      await expect(ssrfService.validateUrl('file:///etc/passwd')).rejects.toThrow(BadRequestException);
      await expect(ssrfService.validateUrl('ftp://104.21.45.12/upload')).rejects.toThrow(BadRequestException);
      await expect(ssrfService.validateUrl('gopher://104.21.45.12')).rejects.toThrow(BadRequestException);
    });

    it('STRICTLY BLOCKS localhost / loopback addresses (127.0.0.1, ::1)', async () => {
      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['127.0.0.1']);
      await expect(ssrfService.validateUrl('http://localhost:3000/internal')).rejects.toThrow(
        BadRequestException,
      );

      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['127.0.0.2']);
      await expect(ssrfService.validateUrl('http://127.0.0.2:8080/metrics')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('STRICTLY BLOCKS RFC 1918 Private Intranet IPs (10.x, 192.168.x, 172.16-31.x)', async () => {
      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['10.0.1.5']);
      await expect(ssrfService.validateUrl('http://internal-db.corp:5432')).rejects.toThrow(
        BadRequestException,
      );

      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['192.168.1.1']);
      await expect(ssrfService.validateUrl('http://router.home/admin')).rejects.toThrow(
        BadRequestException,
      );

      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['172.20.0.1']);
      await expect(ssrfService.validateUrl('http://docker-backend:8080')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('STRICTLY BLOCKS Cloud Metadata Endpoint (169.254.169.254 AWS/GCP/Azure)', async () => {
      jest.spyOn<any, any>(ssrfService, 'resolveIp').mockResolvedValue(['169.254.169.254']);
      await expect(
        ssrfService.validateUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('HMAC Payload Signature Generation', () => {
    it('generates consistent HMAC-SHA256 signature', () => {
      const secret = 'super_secret_webhook_key_2026';
      const payload = { event: 'contact.created', id: 'c123' };

      const sig1 = ssrfService.signPayload(payload, secret);
      const sig2 = ssrfService.signPayload(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // 32 bytes hex encoded = 64 characters
    });
  });
});
