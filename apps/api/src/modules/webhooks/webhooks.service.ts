import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WebhookSsrfService } from './webhook-ssrf.service';
import * as crypto from 'crypto';

export interface CreateWebhookEndpointDto {
  name: string;
  url: string;
  secret?: string;
  description?: string;
  events: string[];
  payloadMapping?: any;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ssrfService: WebhookSsrfService,
  ) {}

  async listEndpoints(organizationId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveryLogs: true },
        },
      },
    });

    return endpoints.map((ep) => ({
      id: ep.id,
      name: ep.name,
      url: ep.url,
      events: ep.events,
      isActive: ep.isActive,
      description: ep.description,
      payloadMapping: ep.payloadMapping,
      deliveryCount: ep._count.deliveryLogs,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
    }));
  }

  async createEndpoint(organizationId: string, userId: string, dto: CreateWebhookEndpointDto) {
    // 1. Verify URL against SSRF protection
    await this.ssrfService.validateUrl(dto.url);

    // 2. Generate signing secret if not supplied
    const secret = dto.secret?.trim() || crypto.randomBytes(24).toString('hex');

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        organizationId,
        name: dto.name,
        url: dto.url,
        secret,
        description: dto.description,
        events: dto.events || ['message.received', 'message.status_update'],
        payloadMapping: dto.payloadMapping || null,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'CREATE_WEBHOOK_ENDPOINT',
        resource: 'webhook_endpoint',
        resourceId: endpoint.id,
        metadata: { name: endpoint.name, url: endpoint.url, events: endpoint.events },
      },
    });

    return endpoint;
  }

  async deleteEndpoint(organizationId: string, userId: string, id: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });

    if (!ep) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    await this.prisma.webhookEndpoint.delete({ where: { id: ep.id } });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'DELETE_WEBHOOK_ENDPOINT',
        resource: 'webhook_endpoint',
        resourceId: id,
        metadata: { name: ep.name, url: ep.url },
      },
    });

    return { message: 'Webhook endpoint removed' };
  }

  async updateEndpoint(
    organizationId: string,
    id: string,
    dto: Partial<CreateWebhookEndpointDto> & { isActive?: boolean },
    userId?: string,
  ) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });

    if (!ep) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    if (dto.url && dto.url !== ep.url) {
      await this.ssrfService.validateUrl(dto.url);
    }

    const updated = await this.prisma.webhookEndpoint.update({
      where: { id: ep.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.url ? { url: dto.url.trim() } : {}),
        ...(dto.secret !== undefined ? { secret: dto.secret.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.events ? { events: dto.events } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      },
    });

    if (userId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: 'UPDATE_WEBHOOK_ENDPOINT',
            resource: 'webhook_endpoint',
            resourceId: id,
            metadata: { name: updated.name, url: updated.url, isActive: updated.isActive },
          },
        });
      } catch (e) {
        // ignore audit log failure
      }
    }

    return updated;
  }

  /**
   * Dispatches real-time event notification to configured outbound endpoints with HMAC signature
   */
  async dispatchEvent(organizationId: string, eventName: string, eventData: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        organizationId,
        isActive: true,
        events: { has: eventName },
      },
    });

    for (const ep of endpoints) {
      await this.deliverWebhook(organizationId, ep, eventName, eventData);
    }
  }

  async deliverWebhook(organizationId: string, endpoint: any, eventName: string, eventData: any, existingEventId?: string) {
    const eventId = existingEventId || `evt_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const payload = {
      event: eventName,
      eventId,
      timestamp,
      organizationId,
      data: eventData,
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(payloadString)
      .digest('hex');

    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      // Re-verify SSRF in case DNS changed
      await this.ssrfService.validateUrl(endpoint.url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DOOT-Signature': `sha256=${signature}`,
          'X-DOOT-Verify-Token': endpoint.secret || '',
          'X-DOOT-Event': eventName,
          'X-DOOT-Delivery-ID': eventId,
        },
        body: payloadString,
        signal: controller.signal,
        redirect: 'error', // Explicitly prevent redirects to avoid SSRF bypass
      });

      clearTimeout(timeout);
      responseStatus = response.status;
      const text = await response.text();
      responseBody = text.slice(0, 1000); // Record first 1000 chars of response
    } catch (err: any) {
      errorMessage = err.message || 'Unknown network error during webhook delivery';
    }

    const durationMs = Date.now() - startTime;

    // Record delivery log
    return this.prisma.webhookDeliveryLog.create({
      data: {
        organizationId,
        webhookEndpointId: endpoint.id,
        eventId,
        event: eventName,
        requestPayload: payload,
        responseStatus,
        responseBody,
        durationMs,
        errorMessage,
      },
    });
  }

  async listDeliveryLogs(organizationId: string, page = 1, limit = 25) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.webhookDeliveryLog.count({ where: { organizationId } }),
      this.prisma.webhookDeliveryLog.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          webhookEndpoint: { select: { id: true, name: true, url: true } },
        },
      }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id,
        eventId: l.eventId,
        event: l.event,
        endpoint: l.webhookEndpoint,
        responseStatus: l.responseStatus,
        durationMs: l.durationMs,
        attempts: l.attempts,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async retryDelivery(organizationId: string, logId: string) {
    const log = await this.prisma.webhookDeliveryLog.findFirst({
      where: { id: logId, organizationId },
      include: { webhookEndpoint: true },
    });

    if (!log) {
      throw new NotFoundException('Delivery log not found');
    }

    // Replay delivery with stable eventId
    return this.deliverWebhook(
      organizationId,
      log.webhookEndpoint,
      log.event,
      (log.requestPayload as any)?.data || log.requestPayload,
      log.eventId || undefined,
    );
  }

  async testEndpoint(organizationId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, organizationId },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    return this.deliverWebhook(organizationId, endpoint, 'endpoint.test_ping', {
      message: 'This is an end-to-end verification ping from DOOT webhook delivery engine.',
      timestamp: new Date().toISOString(),
      testVerification: true,
    });
  }

  async listMessageLogs(
    organizationId: string,
    page: number = 1,
    limit: number = 50,
    status?: string,
    search?: string,
    direction?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };

    if (direction && direction !== 'ALL') {
      where.direction = direction;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      const s = search.trim();
      where.OR = [
        { metaMessageId: { contains: s, mode: 'insensitive' } },
        { body: { contains: s, mode: 'insensitive' } },
        { conversation: { contact: { phone: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              contact: {
                select: {
                  id: true,
                  phone: true,
                  firstName: true,
                  lastName: true,
                },
              },
              phoneNumber: {
                select: {
                  displayPhoneNumber: true,
                  verifiedName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: messages.map((m) => {
        const isOutbound = m.direction === 'OUTBOUND';
        const contactName = `${m.conversation?.contact?.firstName || ''} ${m.conversation?.contact?.lastName || ''}`.trim() || m.conversation?.contact?.phone || 'Customer';
        const systemName = m.conversation?.phoneNumber?.verifiedName || 'Peers Automate';

        return {
          id: m.id,
          metaMessageId: m.metaMessageId,
          direction: m.direction,
          type: m.type,
          body: m.body,
          senderPhone: isOutbound ? (m.conversation?.phoneNumber?.displayPhoneNumber || 'System') : (m.conversation?.contact?.phone || 'Customer'),
          senderName: isOutbound ? systemName : contactName,
          recipientPhone: isOutbound ? (m.conversation?.contact?.phone || '—') : (m.conversation?.phoneNumber?.displayPhoneNumber || 'System'),
          recipientName: isOutbound ? contactName : systemName,
          status: (m.readAt || m.status === 'READ') ? 'READ' : m.status,
          errorCode: m.errorCode,
          errorMessage: m.errorMessage,
          sentAt: m.sentAt,
          deliveredAt: m.deliveredAt,
          readAt: m.readAt,
          createdAt: m.createdAt,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

