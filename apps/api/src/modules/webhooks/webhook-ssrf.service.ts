import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as dns from 'dns/promises';

@Injectable()
export class WebhookSsrfService {
  private readonly logger = new Logger(WebhookSsrfService.name);

  // Private & internal IPv4 CIDRs
  private readonly blockedIpv4Ranges = [
    /^127\./, // 127.0.0.0/8 (Loopback)
    /^10\./, // 10.0.0.0/8 (Private RFC1918)
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private RFC1918)
    /^192\.168\./, // 192.168.0.0/16 (Private RFC1918)
    /^169\.254\./, // 169.254.0.0/16 (Link Local & AWS/GCP/Azure Cloud Metadata)
    /^0\./, // 0.0.0.0/8
  ];

  /**
   * Validates target URL against SSRF threats, localhost bypasses, and cloud metadata targets
   */
  async validateUrl(targetUrl: string): Promise<boolean> {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new BadRequestException('Malformed destination URL format');
    }

    // 1. Protocol Restriction
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException(`Unpermitted URL protocol: ${parsed.protocol}. Only HTTP/HTTPS is allowed.`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Reject obvious loopback names
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      throw new BadRequestException('Destination points to forbidden loopback host');
    }

    // 3. Reject cloud metadata hostnames directly
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      throw new BadRequestException('Destination targets cloud instance metadata service');
    }

    // 4. DNS resolution to verify resolved IP is not internal
    try {
      const addresses = await this.resolveIp(hostname);
      for (const ip of addresses) {
        if (this.isBlockedIp(ip)) {
          this.logger.warn(`SSRF Blocked: ${hostname} resolved to internal/private IP ${ip}`);
          throw new BadRequestException(`SSRF Protection: Webhook destination resolves to private or unpermitted IP address: ${ip}`);
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Could not resolve destination hostname via DNS: ${err.message}`);
    }

    return true;
  }

  protected async resolveIp(hostname: string): Promise<string[]> {
    const addresses = await dns.lookup(hostname, { all: true });
    return addresses.map((a) => a.address);
  }

  isBlockedIp(ip: string): boolean {
    if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
      return true; // IPv6 loopback, link-local, unique local
    }

    return this.blockedIpv4Ranges.some((regex) => regex.test(ip));
  }

  signPayload(payload: any, secret: string): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const cryptoMod = require('crypto');
    return cryptoMod.createHmac('sha256', secret).update(payloadString).digest('hex');
  }
}

