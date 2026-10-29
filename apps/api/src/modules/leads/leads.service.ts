import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeadStatus } from '@doot/shared';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves aggregated Kanban pipeline boards grouped by lead stage
   */
  async getPipeline(organizationId: string) {
    const stages = [
      LeadStatus.NEW,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.PROPOSAL,
      LeadStatus.WON,
      LeadStatus.LOST,
    ];

    const pipelineData: Record<string, any[]> = {};
    for (const stage of stages) {
      const contacts = await this.prisma.contact.findMany({
        where: {
          organizationId,
          leadStatus: stage,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
          leadStatus: true,
          leadSource: true,
          priority: true,
          notes: true,
          followUpDate: true,
          customFields: true,
          tags: {
            include: { tag: true },
          },
          assignedToUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          updatedAt: true,
        },
      });

      pipelineData[stage] = contacts;
    }

    return pipelineData;
  }

  async updateLeadStage(
    organizationId: string,
    contactId: string,
    stage: LeadStatus,
    notes?: string,
    priority?: string,
    followUpDate?: string,
    dealValue?: number,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Lead contact not found');
    }

    const currentCustomFields = (contact.customFields as Record<string, any>) || {};
    const updatedCustomFields = dealValue !== undefined
      ? { ...currentCustomFields, dealValue: Number(dealValue) }
      : currentCustomFields;

    return this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        leadStatus: stage,
        notes: notes !== undefined ? notes : contact.notes,
        priority: priority !== undefined ? priority : contact.priority,
        followUpDate: followUpDate ? new Date(followUpDate) : contact.followUpDate,
        customFields: updatedCustomFields,
      },
    });
  }
}
