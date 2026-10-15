import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContactDto, UpdateContactDto, BulkActionDto, ContactQueryDto } from './dto/contact.dto';
import { normalizePhoneNumber } from './phone-utils';
import { sanitizeCsvCell } from './csv-utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(organizationId: string, query: ContactQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      organizationId,
    };

    if (query.leadStatus) {
      where.leadStatus = query.leadStatus;
    }

    if (query.tagId) {
      where.tags = {
        some: { tagId: query.tagId },
      };
    }

    if (query.groupId) {
      where.groupMemberships = {
        some: { groupId: query.groupId },
      };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { phone: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, contacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            include: { tag: true },
          },
          groupMemberships: {
            include: { group: true },
          },
          assignedToUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { conversations: true },
          },
        },
      }),
    ]);

    return {
      data: contacts.map((c) => ({
        id: c.id,
        phone: c.phone,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed',
        email: c.email,
        companyName: c.companyName,
        leadStatus: c.leadStatus,
        leadSource: c.leadSource,
        priority: c.priority,
        notes: c.notes,
        followUpDate: c.followUpDate,
        optedOutAt: c.optedOutAt,
        isBlocked: c.isBlocked,
        tags: c.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
        groups: c.groupMemberships.map((g) => ({ id: g.group.id, name: g.group.name })),
        assignedUser: c.assignedToUser,
        conversationCount: c._count.conversations,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getContact(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        tags: { include: { tag: true } },
        groupMemberships: { include: { group: true } },
        assignedToUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async createContact(organizationId: string, dto: CreateContactDto) {
    const normalized = normalizePhoneNumber(dto.phone);
    if (!normalized.isValid) {
      throw new BadRequestException(`Invalid international phone number format: "${dto.phone}"`);
    }

    const existing = await this.prisma.contact.findUnique({
      where: {
        organizationId_phone: {
          organizationId,
          phone: normalized.e164,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Contact with phone ${normalized.e164} already exists in this workspace`);
    }

    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          organizationId,
          phone: normalized.e164,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          companyName: dto.companyName,
          leadStatus: dto.leadStatus || 'NEW',
          leadSource: dto.leadSource || 'Manual Entry',
          priority: dto.priority || 'MEDIUM',
          notes: dto.notes,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
        },
      });

      // Attach tags if provided
      if (dto.tagIds && dto.tagIds.length > 0) {
        for (const tagId of dto.tagIds) {
          await tx.contactTag.create({
            data: { contactId: contact.id, tagId },
          });
        }
      }

      // Attach groups if provided
      if (dto.groupIds && dto.groupIds.length > 0) {
        for (const groupId of dto.groupIds) {
          await tx.contactGroupMember.create({
            data: { contactId: contact.id, groupId },
          });
        }
      }

      return contact;
    });
  }

  async updateContact(organizationId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    let phone = contact.phone;
    if (dto.phone && dto.phone !== contact.phone) {
      const normalized = normalizePhoneNumber(dto.phone);
      if (!normalized.isValid) {
        throw new BadRequestException(`Invalid phone number: ${dto.phone}`);
      }
      phone = normalized.e164;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contact.update({
        where: { id: contact.id },
        data: {
          phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          companyName: dto.companyName,
          leadStatus: dto.leadStatus,
          leadSource: dto.leadSource,
          priority: dto.priority,
          notes: dto.notes,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          isBlocked: dto.isBlocked !== undefined ? dto.isBlocked : contact.isBlocked,
        },
      });

      if (dto.tagIds) {
        await tx.contactTag.deleteMany({ where: { contactId: contact.id } });
        for (const tagId of dto.tagIds) {
          await tx.contactTag.create({ data: { contactId: contact.id, tagId } });
        }
      }

      return updated;
    });
  }

  async bulkActions(organizationId: string, dto: BulkActionDto) {
    if (!dto.contactIds || dto.contactIds.length === 0) {
      throw new BadRequestException('No contact IDs specified');
    }

    // Verify all contacts belong to this tenant
    const count = await this.prisma.contact.count({
      where: {
        organizationId,
        id: { in: dto.contactIds },
      },
    });

    if (count !== dto.contactIds.length) {
      throw new BadRequestException('Some selected contacts do not belong to this organization');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Bulk update status
      if (dto.leadStatus) {
        await tx.contact.updateMany({
          where: { id: { in: dto.contactIds }, organizationId },
          data: { leadStatus: dto.leadStatus },
        });
      }

      // 2. Bulk assign user
      if (dto.assignedUserId) {
        await tx.contact.updateMany({
          where: { id: { in: dto.contactIds }, organizationId },
          data: { assignedToUserId: dto.assignedUserId },
        });
      }

      // 3. Bulk add tags
      if (dto.tagIds && dto.tagIds.length > 0) {
        for (const contactId of dto.contactIds) {
          for (const tagId of dto.tagIds) {
            await tx.contactTag.upsert({
              where: { contactId_tagId: { contactId, tagId } },
              update: {},
              create: { contactId, tagId },
            });
          }
        }
      }

      return {
        success: true,
        affectedCount: dto.contactIds.length,
      };
    });
  }

  async deleteContact(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({ where: { id: contact.id } });
    return { message: 'Contact successfully deleted' };
  }

  async exportContactsCsv(organizationId: string): Promise<string> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
      },
    });

    const headers = ['Phone', 'First Name', 'Last Name', 'Email', 'Company', 'Lead Status', 'Lead Source', 'Priority', 'Tags', 'Created At'];
    const rows = contacts.map((c) => [
      sanitizeCsvCell(c.phone),
      sanitizeCsvCell(c.firstName || ''),
      sanitizeCsvCell(c.lastName || ''),
      sanitizeCsvCell(c.email || ''),
      sanitizeCsvCell(c.companyName || ''),
      sanitizeCsvCell(c.leadStatus),
      sanitizeCsvCell(c.leadSource || ''),
      sanitizeCsvCell(c.priority),
      sanitizeCsvCell(c.tags.map((t) => t.tag.name).join('; ')),
      sanitizeCsvCell(c.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    return csvContent;
  }
}
