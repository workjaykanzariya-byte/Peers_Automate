import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------
  // Tags
  // ------------------------------------
  async listTags(organizationId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { organizationId },
      include: {
        _count: { select: { contacts: true } },
      },
      orderBy: { name: 'asc' },
    });

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      contactCount: t._count.contacts,
      createdAt: t.createdAt,
    }));
  }

  async createTag(organizationId: string, name: string, color: string = '#10b981') {
    const cleanName = name.trim();
    const existing = await this.prisma.tag.findUnique({
      where: {
        organizationId_name: { organizationId, name: cleanName },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag "${cleanName}" already exists`);
    }

    return this.prisma.tag.create({
      data: {
        organizationId,
        name: cleanName,
        color,
      },
    });
  }

  async deleteTag(organizationId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({ where: { id: tag.id } });
    return { message: 'Tag successfully deleted' };
  }

  // ------------------------------------
  // Contact Groups
  // ------------------------------------
  async listGroups(organizationId: string) {
    const groups = await this.prisma.contactGroup.findMany({
      where: { organizationId },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      memberCount: g._count.members,
      createdAt: g.createdAt,
    }));
  }

  async createGroup(organizationId: string, name: string, description?: string) {
    const cleanName = name.trim();
    const existing = await this.prisma.contactGroup.findUnique({
      where: {
        organizationId_name: { organizationId, name: cleanName },
      },
    });

    if (existing) {
      throw new ConflictException(`Group "${cleanName}" already exists`);
    }

    return this.prisma.contactGroup.create({
      data: {
        organizationId,
        name: cleanName,
        description,
      },
    });
  }

  async deleteGroup(organizationId: string, id: string) {
    const group = await this.prisma.contactGroup.findFirst({
      where: { id, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.contactGroup.delete({ where: { id: group.id } });
    return { message: 'Group successfully deleted' };
  }
}
