import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ITenantContext } from '@doot/shared';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ITenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
