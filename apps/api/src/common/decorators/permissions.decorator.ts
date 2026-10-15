import { SetMetadata } from '@nestjs/common';
import { PermissionResource, PermissionAction } from '@doot/shared';

export const PERMISSION_METADATA_KEY = 'required_permission';

export interface RequiredPermission {
  resource: PermissionResource;
  action: PermissionAction;
}

export const RequirePermission = (resource: PermissionResource, action: PermissionAction) =>
  SetMetadata(PERMISSION_METADATA_KEY, { resource, action });
