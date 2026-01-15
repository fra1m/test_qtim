import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { Injectable, Inject } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from './entities/auth.entity';
import { IssuedTokens } from '../../common/models/token.model';
import { UserModel } from 'src/common/models/user.model';
import {
  AUTH_ACCESS_PRIVATE_KEY,
  AUTH_REFRESH_PRIVATE_KEY,
  AUTH_TOKEN_PEPPER,
} from 'src/common/constants/auth.constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokens: Repository<TokenEntity>,
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,

    @Inject(AUTH_ACCESS_PRIVATE_KEY)
    private readonly accessPrivateKey: string,
    @Inject(AUTH_REFRESH_PRIVATE_KEY)
    private readonly refreshPrivateKey: string,
    @Inject(AUTH_TOKEN_PEPPER)
    private readonly tokenPepper: string,
  ) {}

  private parseTtlToSeconds(raw: string | number, label: string): number {
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw) || raw <= 0) {
        throw new Error(`Invalid ${label}: ${raw}`);
      }
      return raw;
    }
    const m = String(raw)
      .trim()
      .match(/^(\d+)\s*([smhd])?$/i);
    if (!m) {
      const asNum = Number(raw);
      if (!Number.isFinite(asNum) || asNum <= 0) {
        throw new Error(`Invalid ${label}: ${raw}`);
      }
      return asNum;
    }
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`Invalid ${label}: ${raw}`);
    }
    const unit = (m[2] || 's').toLowerCase();
    const mult =
      unit === 'm' ? 60 : unit === 'h' ? 3600 : unit === 'd' ? 86400 : 1;
    return n * mult;
  }

  private hmacPepper(value: string, pepper: string): string {
    return crypto.createHmac('sha256', pepper).update(value).digest('hex');
  }

  async generateHash(res: string): Promise<string> {
    const roundsRaw = Number(this.cfg.get('SALT_ROUNDS') ?? 12);
    const rounds = Number.isFinite(roundsRaw) && roundsRaw > 0 ? roundsRaw : 12;
    const hashed: string = await bcrypt.hash(res, rounds);
    return hashed;
  }

  /**
   * Выдать пару токенов JWT (RS256) и сохранить refresh для userId
   */
  async generateTokens(
    user: UserModel,
    password?: string,
  ): Promise<IssuedTokens> {
    const accessTtlRaw = this.cfg.get('JWT_ACCESS_TTL') ?? '30m';
    const refreshTtlRaw = this.cfg.get('JWT_REFRESH_TTL') ?? '30d';
    const accessTtlSec = this.parseTtlToSeconds(accessTtlRaw, 'JWT_ACCESS_TTL');
    const refreshTtlSec = this.parseTtlToSeconds(
      refreshTtlRaw,
      'JWT_REFRESH_TTL',
    );

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.sub,
        email: user.email,
        name: user.name,
        contributionId: user.contributionId,
      },
      {
        algorithm: 'RS256',
        privateKey: this.accessPrivateKey,
        expiresIn: accessTtlSec,
        jwtid: accessJti,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.sub },
      {
        algorithm: 'RS256',
        privateKey: this.refreshPrivateKey,
        expiresIn: refreshTtlSec,
        jwtid: refreshJti,
      },
    );

    const peppered = this.hmacPepper(refreshToken, this.tokenPepper);

    const refreshHash = await this.generateHash(peppered);

    let passwordHash;
    if (password) {
      passwordHash = await this.generateHash(password);
    }

    await this.tokens.upsert(
      password
        ? { userId: user.sub, token: refreshHash, passwordHash }
        : { userId: user.sub, token: refreshHash },
      { conflictPaths: ['userId'], skipUpdateIfNoValuesChanged: true },
    );

    return {
      accessToken,
      refreshToken,
      accessJti,
      refreshJti,
      accessTtlSec,
      refreshTtlSec,
    };
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
