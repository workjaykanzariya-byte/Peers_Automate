import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthUser } from '@doot/shared';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IAuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
