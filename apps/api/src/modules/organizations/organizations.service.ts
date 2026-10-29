import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UserRole, OrganizationStatus } from '@doot/shared';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganization(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            memberships: true,
            contacts: true,
            phoneNumbers: true,
            whatsappTemplates: true,
            campaigns: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization workspace not found');
    }

    return org;
  }

  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        isActive: true,
        organization: { status: OrganizationStatus.ACTIVE },
      },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      planTier: m.organization.planTier,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const baseSlug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug}-${slugSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          planTier: 'STARTER',
          status: OrganizationStatus.ACTIVE,
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: org.id,
          userId,
          role: UserRole.OWNER,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId,
          action: 'CREATE_ORGANIZATION',
          resource: 'organization',
          resourceId: org.id,
          metadata: { name: org.name, slug: org.slug },
        },
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: membership.role,
      };
    });
  }

  async getMembers(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      user: m.user,
      joinedAt: m.createdAt,
    }));
  }

  async updateCurrentOrganization(organizationId: string, dto: any, userId?: string) {
    const updateData: any = {};
    if (dto.name && dto.name.trim()) updateData.name = dto.name.trim();
    if (dto.timezone && dto.timezone.trim()) updateData.timezone = dto.timezone.trim();
    if (dto.settings) updateData.settings = dto.settings;

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    if (userId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: 'UPDATE_ORGANIZATION_SETTINGS',
            resource: 'organization',
            resourceId: organizationId,
            metadata: { updatedFields: Object.keys(updateData) },
          },
        });
      } catch (e) {
        // fail-safe
      }
    }

    return updated;
  }
}
