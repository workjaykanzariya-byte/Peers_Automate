import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    guard = new PlatformAdminGuard();
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getClass: () => ({} as any),
      getHandler: () => ({} as any),
      getArgs: () => [] as any,
      getArgByIndex: () => ({}) as any,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http' as any,
    } as unknown as ExecutionContext;
  };

  it('should allow access if user is authenticated and isPlatformAdmin is true', () => {
    const context = createMockContext({
      id: 'platform-owner-id',
      email: 'owner@doot.io',
      isPlatformAdmin: true,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if no user is present on request', () => {
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Authentication required');
  });

  it('should throw ForbiddenException if user is normal tenant admin (isPlatformAdmin: false)', () => {
    const context = createMockContext({
      id: 'customer-owner-id',
      email: 'admin@acme.com',
      isPlatformAdmin: false,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/DOOT Platform Administrator privileges/);
  });

  it('should throw ForbiddenException if isPlatformAdmin is undefined or truthy non-boolean', () => {
    const context = createMockContext({
      id: 'attacker-id',
      email: 'attacker@evil.com',
      isPlatformAdmin: 'true', // string injection attempt
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
