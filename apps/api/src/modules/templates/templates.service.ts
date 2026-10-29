import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../security/encryption.service';
import { MetaApiService } from '../meta/meta-api.service';
import { TemplateCategory, TemplateStatus } from '@doot/shared';

export interface CreateTemplateDto {
  metaIntegrationId?: string;
  name: string;
  language: string;
  category: TemplateCategory;
  components: any[];
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly lastPendingCheck = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly metaApi: MetaApiService,
  ) {}

  async listTemplates(
    organizationId: string,
    query: { search?: string; category?: TemplateCategory; status?: TemplateStatus },
  ) {
    const activeIntegrations = await this.prisma.metaIntegration.findMany({
      where: { organizationId, status: 'CONNECTED' },
      select: { id: true },
    });
    const activeIntegIds = activeIntegrations.map((i) => i.id);

    const where: any = { organizationId };

    if (activeIntegIds.length > 0) {
      where.metaIntegrationId = { in: activeIntegIds };
    }

    if (query.category) {
      where.category = query.category;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.name = { contains: query.search.trim().toLowerCase(), mode: 'insensitive' };
    }

    const templates = await this.prisma.whatsAppTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        metaIntegration: {
          select: { id: true, name: true, wabaId: true },
        },
      },
    });

    // Smart auto-check: if any template is pending review, query Meta in background to sync approval state
    const hasPending = templates.some((t) => t.status === TemplateStatus.PENDING);
    if (hasPending) {
      const now = Date.now();
      const lastCheck = this.lastPendingCheck.get(organizationId) || 0;
      if (now - lastCheck > 5000) {
        this.lastPendingCheck.set(organizationId, now);
        await this.syncPendingTemplates(organizationId, templates);
      }
    }

    return templates.map((t) => {
      const components = (t.components as any[]) || [];
      const bodyComp = components.find((c) => c.type === 'BODY');
      const headerComp = components.find((c) => c.type === 'HEADER');
      const footerComp = components.find((c) => c.type === 'FOOTER');
      const buttonsComp = components.find((c) => c.type === 'BUTTONS');

      // Extract {{1}}, {{2}} parameter count
      const bodyText = bodyComp?.text || '';
      const variableMatches = bodyText.match(/{{\d+}}/g) || [];

      return {
        id: t.id,
        metaTemplateId: t.metaTemplateId,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        header: headerComp,
        bodyText,
        footerText: footerComp?.text || null,
        buttons: buttonsComp?.buttons || [],
        variableCount: variableMatches.length,
        components: t.components,
        metaIntegration: t.metaIntegration,
        updatedAt: t.updatedAt,
      };
    });
  }

  /**
   * Automatically polls Meta Cloud API when templates are in PENDING review state
   */
  private async syncPendingTemplates(organizationId: string, currentTemplates: any[]) {
    try {
      const pending = currentTemplates.filter((t) => t.status === TemplateStatus.PENDING);
      if (pending.length === 0) return;

      const integrations = await this.prisma.metaIntegration.findMany({
        where: { organizationId, status: 'CONNECTED' },
      });

      for (const integration of integrations) {
        if (!integration.wabaId || !integration.encryptedAccessToken) continue;
        const plaintextToken = this.encryption.decrypt(integration.encryptedAccessToken);
        const metaRes = await this.metaApi.getWabaTemplates(integration.wabaId, plaintextToken);
        const metaTemplates = metaRes?.data || [];

        for (const pt of pending) {
          const match = metaTemplates.find((m: any) => m.name === pt.name || m.id === pt.metaTemplateId);
          if (match && match.status && match.status !== 'PENDING') {
            const newStatus =
              match.status === 'APPROVED'
                ? TemplateStatus.APPROVED
                : match.status === 'REJECTED'
                ? TemplateStatus.REJECTED
                : match.status === 'PAUSED'
                ? TemplateStatus.PAUSED
                : TemplateStatus.PENDING;

            if (newStatus !== pt.status) {
              await this.prisma.whatsAppTemplate.update({
                where: { id: pt.id },
                data: { status: newStatus, updatedAt: new Date() },
              });
              pt.status = newStatus;
              this.logger.log(`Auto-synced pending template "${pt.name}" status -> ${newStatus}`);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to auto-sync pending templates: ${err.message}`);
    }
  }

  async getTemplate(organizationId: string, id: string) {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, organizationId },
      include: {
        metaIntegration: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Synchronizes templates from Meta WhatsApp Business Account
   */
  async syncTemplates(organizationId: string) {
    const integrations = await this.prisma.metaIntegration.findMany({
      where: { organizationId, status: 'CONNECTED' },
    });

    if (integrations.length === 0) {
      throw new BadRequestException('No connected WhatsApp Business Account found to synchronize templates from');
    }

    let totalSynced = 0;

    for (const integration of integrations) {
      try {
        const plaintextToken = this.encryption.decrypt(integration.encryptedAccessToken);
        const metaRes = await this.metaApi.getWabaTemplates(integration.wabaId, plaintextToken);

        const templates = metaRes?.data || [];
        const syncedMetaIds: string[] = [];

        for (const tpl of templates) {
          const category =
            tpl.category === 'MARKETING'
              ? TemplateCategory.MARKETING
              : tpl.category === 'AUTHENTICATION'
              ? TemplateCategory.AUTHENTICATION
              : TemplateCategory.UTILITY;

          const status =
            tpl.status === 'APPROVED'
              ? TemplateStatus.APPROVED
              : tpl.status === 'REJECTED'
              ? TemplateStatus.REJECTED
              : tpl.status === 'PAUSED'
              ? TemplateStatus.PAUSED
              : TemplateStatus.PENDING;

          const metaId = tpl.id || `tpl_${Date.now()}`;
          syncedMetaIds.push(metaId);

          await this.prisma.whatsAppTemplate.upsert({
            where: {
              organizationId_name_language: {
                organizationId,
                name: tpl.name,
                language: tpl.language || 'en_US',
              },
            },
            update: {
              metaIntegrationId: integration.id,
              metaTemplateId: metaId,
              category,
              status,
              components: tpl.components || [],
              updatedAt: new Date(),
            },
            create: {
              organizationId,
              metaIntegrationId: integration.id,
              metaTemplateId: metaId,
              name: tpl.name,
              language: tpl.language || 'en_US',
              category,
              status,
              components: tpl.components || [],
            },
          });
          totalSynced++;
        }

        // Clean up stale templates: remove any template that belongs to a different/old WABA integration,
        // or templates that no longer exist in this Meta WABA
        if (syncedMetaIds.length > 0) {
          await this.prisma.whatsAppTemplate.deleteMany({
            where: {
              organizationId,
              OR: [
                { metaIntegrationId: { not: integration.id } },
                { metaTemplateId: { notIn: syncedMetaIds } },
              ],
            },
          });
        } else {
          // If no templates on Meta, clean up all templates for this organization
          await this.prisma.whatsAppTemplate.deleteMany({
            where: { organizationId },
          });
        }
      } catch (err: any) {
        this.logger.error(`Error synchronizing templates for integration ${integration.wabaId}: ${err.message}`);
      }
    }

    return {
      message: `Successfully synchronized ${totalSynced} templates from Meta Cloud API`,
      count: totalSynced,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates a template in local workspace and prepares it for Meta API approval
   */
  async createTemplate(organizationId: string, userId: string, dto: CreateTemplateDto) {
    let integrationId = dto.metaIntegrationId;
    if (!integrationId) {
      const defaultIntegration = await this.prisma.metaIntegration.findFirst({
        where: { organizationId, status: 'CONNECTED' },
        orderBy: { createdAt: 'desc' },
      });
      if (!defaultIntegration) {
        throw new BadRequestException('No connected Meta WhatsApp Account found');
      }
      integrationId = defaultIntegration.id;
    }

    const cleanName = dto.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const existing = await this.prisma.whatsAppTemplate.findUnique({
      where: {
        organizationId_name_language: {
          organizationId,
          name: cleanName,
          language: dto.language || 'en_US',
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Template with name "${cleanName}" in language "${dto.language}" already exists`);
    }

    const integration = await this.prisma.metaIntegration.findUnique({
      where: { id: integrationId },
    });

    let metaTemplateId = `meta_tpl_${cleanName}_${Date.now()}`;
    let templateStatus = TemplateStatus.PENDING;
    const normalizedComponents = JSON.parse(JSON.stringify(dto.components || []));

    if (integration) {
      const plaintextToken = this.encryption.decrypt(integration.encryptedAccessToken);
      if (!plaintextToken.includes('mock')) {
        try {
          // 1. Validate & prepare HEADER media components for Meta compliance
          for (const comp of normalizedComponents) {
            if (comp.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format)) {
              const hasHandle = comp.example?.header_handle?.length > 0 && comp.example.header_handle[0];
              if (!hasHandle) {
                let fileBuffer: Buffer;
                let mime = 'image/png';
                if (comp.format === 'IMAGE') {
                  const defaultPngBase64 =
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                  fileBuffer = Buffer.from(defaultPngBase64, 'base64');
                  mime = 'image/png';
                } else if (comp.format === 'DOCUMENT') {
                  const samplePdf =
                    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
                  fileBuffer = Buffer.from(samplePdf, 'utf-8');
                  mime = 'application/pdf';
                } else {
                  fileBuffer = Buffer.from('sample video', 'utf-8');
                  mime = 'video/mp4';
                }

                const handle = await this.metaApi.uploadTemplateSampleMedia(plaintextToken, fileBuffer, mime);
                comp.example = {
                  header_handle: [handle],
                };
              }
            }

            // 2. Validate & prepare BODY variables for Meta compliance
            if (comp.type === 'BODY') {
              const matches = (comp.text || '').match(/{{\d+}}/g) || [];
              if (matches.length > 0) {
                if (
                  !comp.example ||
                  !comp.example.body_text ||
                  !comp.example.body_text[0] ||
                  comp.example.body_text[0].length === 0
                ) {
                  const sampleValues = matches.map((_, i) => `Sample ${i + 1}`);
                  comp.example = {
                    body_text: [sampleValues],
                  };
                }
              }
            }
          }

          const metaRes = await this.metaApi.createWabaTemplate(integration.wabaId, plaintextToken, {
            name: cleanName,
            category: dto.category,
            components: normalizedComponents,
            language: dto.language || 'en_US',
          });
          if (metaRes?.id) {
            metaTemplateId = metaRes.id;
            templateStatus =
              metaRes.status === 'APPROVED'
                ? TemplateStatus.APPROVED
                : metaRes.status === 'REJECTED'
                ? TemplateStatus.REJECTED
                : TemplateStatus.PENDING;
          }
        } catch (metaErr: any) {
          this.logger.error(`Meta API template creation error: ${metaErr.message}`);
          throw new BadRequestException(
            `Meta Graph API rejected template: ${metaErr.message || 'Invalid template format or permissions'}`,
          );
        }
      } else {
        templateStatus = TemplateStatus.PENDING;
      }
    }

    const template = await this.prisma.whatsAppTemplate.create({
      data: {
        organizationId,
        metaIntegrationId: integrationId,
        metaTemplateId,
        name: cleanName,
        language: dto.language || 'en_US',
        category: dto.category,
        status: templateStatus,
        components: normalizedComponents,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'CREATE_WHATSAPP_TEMPLATE',
        resource: 'whatsapp_template',
        resourceId: template.id,
        metadata: { name: template.name, category: template.category },
      },
    });

    return template;
  }
}
