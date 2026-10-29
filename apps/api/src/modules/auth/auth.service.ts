import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UserRole, OrganizationStatus } from '@doot/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Generate unique slug for organization
    const baseSlug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug}-${slugSuffix}`;

    // Execute atomic transaction creating user, organization, and owner membership
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isActive: true,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
          planTier: 'STARTER',
          status: OrganizationStatus.ACTIVE,
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: UserRole.OWNER,
          isActive: true,
        },
      });

      // Write security audit log
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          action: 'REGISTER_TENANT_OWNER',
          resource: 'user',
          resourceId: user.id,
          metadata: { organizationName: org.name, slug: org.slug },
        },
      });

      return { user, org, membership };
    });

    const token = await this.generateTokens(result.user.id, result.user.email);

    return {
      message: 'Account and organization workspace successfully registered',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        role: result.membership.role,
      },
      token,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.generateTokens(user.id, user.email);

    // Record session
    const tokenHash = crypto.createHash('sha256').update(token.accessToken).digest('hex');
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    let activeOrgs = user.memberships
      .filter((m) => m.organization.status === 'ACTIVE')
      .map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        planTier: m.organization.planTier,
      }));

    if (user.isPlatformAdmin) {
      const allActiveOrgs = await this.prisma.organization.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      const existingIds = new Set(activeOrgs.map((o) => o.id));
      for (const org of allActiveOrgs) {
        if (!existingIds.has(org.id)) {
          activeOrgs.push({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: 'OWNER' as any,
            planTier: org.planTier,
          });
        }
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      organizations: activeOrgs,
      token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let orgList = user.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      planTier: m.organization.planTier,
    }));

    if (user.isPlatformAdmin) {
      const allActiveOrgs = await this.prisma.organization.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      const existingIds = new Set(orgList.map((o) => o.id));
      for (const org of allActiveOrgs) {
        if (!existingIds.has(org.id)) {
          orgList.push({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: 'OWNER' as any,
            planTier: org.planTier,
          });
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isPlatformAdmin: user.isPlatformAdmin,
      organizations: orgList,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
    };
  }
}
