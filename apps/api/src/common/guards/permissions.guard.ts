import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { hasPermission, ITenantContext } from '@doot/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission metadata is set, access is permitted to authenticated tenant members
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant: ITenantContext = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant context must be established before verifying permissions');
    }

    // Platform admin bypass if applicable, or check role permission matrix
    if (tenant.user.isPlatformAdmin) {
      return true;
    }

    const isAllowed = hasPermission(
      tenant.role,
      requiredPermission.resource,
      requiredPermission.action,
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        `Insufficient privileges: action '${requiredPermission.action}' on resource '${requiredPermission.resource}' requires elevated role permissions (current role: ${tenant.role})`,
      );
    }

    return true;
  }
}
