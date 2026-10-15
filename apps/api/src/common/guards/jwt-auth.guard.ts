import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { IAuthUser } from '@doot/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from HttpOnly cookie or Authorization header
    let token = request.cookies?.['doot_access_token'];
    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing or invalid session');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'doot-production-grade-super-secret-jwt-key-2026-secure');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Verify user exists and is active in database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          isPlatformAdmin: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is inactive or no longer exists');
      }

      const authUser: IAuthUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        phone: user.phone ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        isPlatformAdmin: user.isPlatformAdmin,
      };

      request.user = authUser;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
