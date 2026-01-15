import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokenEntity } from './entities/auth.entity';
import {
  AUTH_ACCESS_PRIVATE_KEY,
  AUTH_REFRESH_PRIVATE_KEY,
  AUTH_TOKEN_PEPPER,
} from 'src/common/constants/auth.constants';
import { UserModel } from 'src/common/models/user.model';
import * as crypto from 'crypto';

describe('AuthService business logic', () => {
  let service: AuthService;
  let jwt: { signAsync: jest.Mock<Promise<string>, [any, any]> };
  let config: { get: jest.Mock<any, [string]> };
  let repo: { upsert: jest.Mock<Promise<unknown>, [any, any]> };

  const accessKey = 'access-private-key';
  const refreshKey = 'refresh-private-key';
  const tokenPepper = 'token-pepper';
  const accessJti = '00000000-0000-0000-0000-000000000001';
  const refreshJti = '00000000-0000-0000-0000-000000000002';

  const user: UserModel = {
    sub: 1,
    email: 'test@example.com',
    name: 'Tester',
  };

  let configMap: Record<string, unknown>;

  beforeEach(async () => {
    configMap = {
      JWT_ACCESS_TTL: '30m',
      JWT_REFRESH_TTL: '30d',
      SALT_ROUNDS: 10,
    };
    jwt = {
      signAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => configMap[key]),
    };
    repo = {
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: getRepositoryToken(TokenEntity), useValue: repo },
        { provide: AUTH_ACCESS_PRIVATE_KEY, useValue: accessKey },
        { provide: AUTH_REFRESH_PRIVATE_KEY, useValue: refreshKey },
        { provide: AUTH_TOKEN_PEPPER, useValue: tokenPepper },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generateTokens returns tokens and saves refresh hash', async () => {
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    const randomSpy = jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce(accessJti)
      .mockReturnValueOnce(refreshJti);
    const hashSpy = jest
      .spyOn(service, 'generateHash')
      .mockResolvedValue('refresh-hash');
    repo.upsert.mockResolvedValue({});

    const result = await service.generateTokens(user);

    const expectedPeppered = crypto
      .createHmac('sha256', tokenPepper)
      .update('refresh-token')
      .digest('hex');

    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: user.sub,
        email: user.email,
        name: user.name,
      },
      {
        algorithm: 'RS256',
        privateKey: accessKey,
        expiresIn: 1800,
        jwtid: accessJti,
      },
    );
    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      2,
      { sub: user.sub },
      {
        algorithm: 'RS256',
        privateKey: refreshKey,
        expiresIn: 2592000,
        jwtid: refreshJti,
      },
    );
    expect(hashSpy).toHaveBeenCalledWith(expectedPeppered);
    expect(repo.upsert).toHaveBeenCalledWith(
      { userId: user.sub, token: 'refresh-hash' },
      { conflictPaths: ['userId'], skipUpdateIfNoValuesChanged: true },
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessJti,
      refreshJti,
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    });
    expect(randomSpy).toHaveBeenCalledTimes(2);
  });

  it('generateTokens includes password hash when password is provided', async () => {
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce(accessJti)
      .mockReturnValueOnce(refreshJti);
    jest
      .spyOn(service, 'generateHash')
      .mockResolvedValueOnce('refresh-hash')
      .mockResolvedValueOnce('password-hash');
    repo.upsert.mockResolvedValue({});

    await service.generateTokens(user, 'Passw0rd!');

    expect(repo.upsert).toHaveBeenCalledWith(
      {
        userId: user.sub,
        token: 'refresh-hash',
        passwordHash: 'password-hash',
      },
      { conflictPaths: ['userId'], skipUpdateIfNoValuesChanged: true },
    );
  });

  it('generateTokens throws for invalid access TTL', async () => {
    configMap.JWT_ACCESS_TTL = '0';

    await expect(service.generateTokens(user)).rejects.toThrow(
      'Invalid JWT_ACCESS_TTL: 0',
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('loginByPassword returns tokens when password is valid', async () => {
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessJti: 'access-jti',
      refreshJti: 'refresh-jti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };
    const verifySpy = jest
      .spyOn(service as any, 'verifyPassword')
      .mockResolvedValue(true);
    const generateSpy = jest
      .spyOn(service, 'generateTokens')
      .mockResolvedValue(tokens);

    const result = await service.loginByPassword({
      user,
      password: 'secret',
    });

    expect(verifySpy).toHaveBeenCalledWith(user.sub, 'secret');
    expect(generateSpy).toHaveBeenCalledWith(user);
    expect(result).toEqual(tokens);
  });

  it('loginByPassword throws UnauthorizedException when password is invalid', async () => {
    const verifySpy = jest
      .spyOn(service as any, 'verifyPassword')
      .mockResolvedValue(false);
    const generateSpy = jest.spyOn(service, 'generateTokens');

    await expect(
      service.loginByPassword({ user, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifySpy).toHaveBeenCalledWith(user.sub, 'wrong');
    expect(generateSpy).not.toHaveBeenCalled();
  });
});
