import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ITenantContext, UserRole } from '@doot/shared';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User must be authenticated before tenant context can be resolved');
    }

    // 1. Identify requested organization ID from header, param, or query
    let requestedOrgId = request.headers['x-tenant-id'] as string;
    if (!requestedOrgId && request.params?.organizationId) {
      requestedOrgId = request.params.organizationId;
    }
    if (!requestedOrgId && request.query?.organizationId) {
      requestedOrgId = request.query.organizationId as string;
    }

    // 2. Query memberships for this user
    if (requestedOrgId) {
      if (user.isPlatformAdmin) {
        const org = await this.prisma.organization.findUnique({
          where: { id: requestedOrgId },
        });
        if (org) {
          request.tenant = {
            organizationId: org.id,
            organizationName: org.name,
            role: UserRole.OWNER,
            user,
          };
          return true;
        }
      }

      // Validate membership in the explicitly requested tenant
      const membership = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: requestedOrgId,
            userId: user.id,
          },
        },
        include: {
          organization: true,
        },
      });

      if (!membership || !membership.isActive) {
        throw new ForbiddenException('You do not have active authorization to access this organization');
      }

      if (membership.organization.status !== 'ACTIVE') {
        throw new ForbiddenException(`Organization workspace is currently ${membership.organization.status.toLowerCase()}`);
      }

      const tenantContext: ITenantContext = {
        organizationId: membership.organization.id,
        organizationName: membership.organization.name,
        role: membership.role as UserRole,
        user,
      };

      request.tenant = tenantContext;
      return true;
    } else {
      if (user.isPlatformAdmin) {
        const firstOrg = await this.prisma.organization.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        });
        if (firstOrg) {
          request.tenant = {
            organizationId: firstOrg.id,
            organizationName: firstOrg.name,
            role: UserRole.OWNER,
            user,
          };
          return true;
        }
      }

      // Fall back to default/first active organization for user
      const membership = await this.prisma.membership.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          organization: {
            status: 'ACTIVE',
          },
        },
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!membership) {
        throw new ForbiddenException('User does not belong to any active organization');
      }

      const tenantContext: ITenantContext = {
        organizationId: membership.organization.id,
        organizationName: membership.organization.name,
        role: membership.role as UserRole,
        user,
      };

      request.tenant = tenantContext;
      return true;
    }
  }
}
