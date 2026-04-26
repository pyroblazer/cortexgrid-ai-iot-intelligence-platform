import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId, organizationId } = payload;

    // Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        memberships: {
          where: {
            organizationId,
            isActive: true,
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException(
        'No active membership in this organization',
      );
    }

    // Attach user and membership info to request
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId,
      membership: {
        role: membership.role,
        organization: membership.organization,
      },
    };
  }
}
