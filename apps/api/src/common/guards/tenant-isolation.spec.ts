import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextGuard } from './tenant-context.guard';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, PermissionResource, PermissionAction } from '@doot/shared';

describe('Tenant Isolation & RBAC Security Guards', () => {
  let tenantGuard: TenantContextGuard;
  let permissionsGuard: PermissionsGuard;
  let mockPrisma: any;
  let reflector: Reflector;

  beforeEach(() => {
    mockPrisma = {
      membership: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    tenantGuard = new TenantContextGuard(mockPrisma as unknown as PrismaService);
    reflector = new Reflector();
    permissionsGuard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any, requestedOrgId?: string, params?: any) => {
    const req: any = {
      user,
      headers: requestedOrgId ? { 'x-tenant-id': requestedOrgId } : {},
      params: params || {},
      query: {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('ALLOWS access when user has active membership in the requested organization', async () => {
    const user = { id: 'user-alice-123', email: 'alice@acme.com', isPlatformAdmin: false };
    const orgId = 'org-acme-999';

    mockPrisma.membership.findUnique.mockResolvedValue({
      id: 'mem-1',
      organizationId: orgId,
      userId: user.id,
      role: UserRole.OWNER,
      isActive: true,
      organization: {
        id: orgId,
        name: 'Acme Enterprises',
        status: 'ACTIVE',
      },
    });

    const ctx = createMockContext(user, orgId);
    const result = await tenantGuard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.tenant).toBeDefined();
    expect(req.tenant.organizationId).toBe(orgId);
    expect(req.tenant.role).toBe(UserRole.OWNER);
  });

  it('STRICTLY DENIES access (ForbiddenException) when a tenant tries to access another organization', async () => {
    const attackerUser = { id: 'attacker-hank-456', email: 'hank@globex.com', isPlatformAdmin: false };
    const victimOrgId = 'org-acme-999'; // Acme's org ID

    // Attacker does NOT have membership in Acme
    mockPrisma.membership.findUnique.mockResolvedValue(null);

    const ctx = createMockContext(attackerUser, victimOrgId);

    await expect(tenantGuard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenException('You do not have active authorization to access this organization'),
    );
  });

  it('DENIES access if the organization workspace is suspended', async () => {
    const user = { id: 'user-bob', email: 'bob@example.com', isPlatformAdmin: false };
    const suspendedOrgId = 'org-suspended-1';

    mockPrisma.membership.findUnique.mockResolvedValue({
      id: 'mem-2',
      organizationId: suspendedOrgId,
      userId: user.id,
      role: UserRole.AGENT,
      isActive: true,
      organization: {
        id: suspendedOrgId,
        name: 'Suspended Org',
        status: 'SUSPENDED',
      },
    });

    const ctx = createMockContext(user, suspendedOrgId);

    await expect(tenantGuard.canActivate(ctx)).rejects.toThrow(
      'Organization workspace is currently suspended',
    );
  });

  it('RBAC PermissionsGuard correctly blocks AGENT from executing CREDENTIALS operations', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      resource: PermissionResource.CREDENTIALS,
      action: PermissionAction.UPDATE,
    });

    const mockReq = {
      tenant: {
        organizationId: 'org-1',
        organizationName: 'Acme',
        role: UserRole.AGENT,
        user: { id: 'u1', email: 'agent@acme.com', isPlatformAdmin: false },
      },
    };

    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(() => permissionsGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('RBAC PermissionsGuard allows OWNER or ADMIN to execute authorized operations', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      resource: PermissionResource.CREDENTIALS,
      action: PermissionAction.UPDATE,
    });

    const mockReq = {
      tenant: {
        organizationId: 'org-1',
        organizationName: 'Acme',
        role: UserRole.OWNER,
        user: { id: 'u1', email: 'owner@acme.com', isPlatformAdmin: false },
      },
    };

    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    const result = permissionsGuard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
