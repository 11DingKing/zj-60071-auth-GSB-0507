import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password, tenantCode } = loginDto;

    const tenant = await this.prismaService.tenant.findUnique({
      where: { code: tenantCode },
    });

    if (!tenant || !tenant.isEnabled) {
      throw new UnauthorizedException('租户不存在或已禁用');
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        username_tenantId: {
          username,
          tenantId: tenant.id,
        },
      },
    });

    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id, tenant.id, user.username);
  }

  async register(registerDto: RegisterDto) {
    const { username, password, invitationCode, tenantCode, email, phone } = registerDto;

    let tenantId: string;
    let invitationId: string | null = null;

    if (invitationCode) {
      const invitation = await this.prismaService.invitationCode.findUnique({
        where: { code: invitationCode },
      });

      if (!invitation) {
        throw new BadRequestException('邀请码无效');
      }

      if (invitation.isUsed) {
        throw new BadRequestException('邀请码已使用');
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        throw new BadRequestException('邀请码已过期');
      }

      tenantId = invitation.tenantId;
      invitationId = invitation.id;
    } else if (tenantCode) {
      const tenant = await this.prismaService.tenant.findUnique({
        where: { code: tenantCode },
      });

      if (!tenant || !tenant.isEnabled) {
        throw new BadRequestException('租户不存在或已禁用');
      }

      tenantId = tenant.id;
    } else {
      throw new BadRequestException('需要提供邀请码或租户编码');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: {
        username_tenantId: {
          username,
          tenantId,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username,
        password: hashedPassword,
        tenantId,
        email,
        phone,
      },
    });

    if (invitationId) {
      await this.prismaService.invitationCode.update({
        where: { id: invitationId },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedById: user.id,
        },
      });
    }

    return this.generateTokens(user.id, tenantId, user.username);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const storedToken = await this.redisService.get(`refresh_token:${payload.userId}`);
      
      if (storedToken === 'LOGGED_OUT') {
        throw new UnauthorizedException('刷新令牌已失效（用户已退出登录）');
      }

      if (storedToken && storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isEnabled) {
        throw new UnauthorizedException('用户不存在或已禁用');
      }

      return this.generateTokens(user.id, user.tenantId, user.username);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async logout(accessToken: string, userId: string) {
    const accessPayload = this.jwtService.decode(accessToken) as any;
    const accessExp = accessPayload?.exp || 0;
    const accessTtl = Math.max(0, accessExp - Math.floor(Date.now() / 1000));

    if (accessTtl > 0) {
      await this.redisService.set(`blacklist:${accessToken}`, '1', accessTtl);
    }

    const refreshExpiresIn = 7 * 24 * 60 * 60;
    await this.redisService.set(`refresh_token:${userId}`, 'LOGGED_OUT', refreshExpiresIn);

    return { message: '退出登录成功' };
  }

  private async generateTokens(userId: string, tenantId: string, username: string) {
    const accessToken = this.jwtService.sign(
      {
        userId,
        tenantId,
        username,
        type: 'access',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        userId,
        tenantId,
        username,
        type: 'refresh',
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    );

    const refreshExpiresIn = 7 * 24 * 60 * 60;
    await this.redisService.set(`refresh_token:${userId}`, refreshToken, refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: 'Bearer',
    };
  }
}
