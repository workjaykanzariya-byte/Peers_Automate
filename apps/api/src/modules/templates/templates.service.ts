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

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly metaApi: MetaApiService,
  ) {}

  async listTemplates(
    organizationId: string,
    query: { search?: string; category?: TemplateCategory; status?: TemplateStatus },
  ) {
    const where: any = { organizationId };

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

          await this.prisma.whatsAppTemplate.upsert({
            where: {
              organizationId_name_language: {
                organizationId,
                name: tpl.name,
                language: tpl.language || 'en_US',
              },
            },
            update: {
              metaTemplateId: tpl.id || `tpl_${Date.now()}`,
              category,
              status,
              components: tpl.components || [],
              updatedAt: new Date(),
            },
            create: {
              organizationId,
              metaIntegrationId: integration.id,
              metaTemplateId: tpl.id || `tpl_${Date.now()}`,
              name: tpl.name,
              language: tpl.language || 'en_US',
              category,
              status,
              components: tpl.components || [],
            },
          });
          totalSynced++;
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

    if (integration) {
      const plaintextToken = this.encryption.decrypt(integration.encryptedAccessToken);
      if (!plaintextToken.includes('mock')) {
        try {
          const metaRes = await this.metaApi.createWabaTemplate(integration.wabaId, plaintextToken, {
            name: cleanName,
            category: dto.category,
            components: dto.components || [],
            language: dto.language || 'en_US',
          });
          if (metaRes?.id) {
            metaTemplateId = metaRes.id;
            templateStatus = metaRes.status === 'APPROVED' ? TemplateStatus.APPROVED : TemplateStatus.PENDING;
          }
        } catch (metaErr: any) {
          this.logger.error(`Meta API template creation error: ${metaErr.message}`);
          throw new BadRequestException(`Meta Graph API rejected template: ${metaErr.message || 'Invalid template format or permissions'}`);
        }
      } else {
        templateStatus = TemplateStatus.APPROVED;
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
        components: dto.components || [],
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
