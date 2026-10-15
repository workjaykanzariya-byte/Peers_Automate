import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.isPlatformAdmin !== true) {
      throw new ForbiddenException(
        'Access denied: DOOT Platform Administrator privileges are strictly required for this endpoint.',
      );
    }

    return true;
  }
}
