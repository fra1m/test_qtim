import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { CacheHelper } from 'src/common/redis/redis.service';
import { AppLogger } from 'src/common/logger/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { TokenModel } from '../auth/models/token.model';
import { UserModel } from './models/user.model';

describe('UserController registration', () => {
  let controller: UserController;
  let userService: { createUser: jest.Mock; getByEmail: jest.Mock };
  let authService: { generateTokens: jest.Mock; authByPassword: jest.Mock };
  let cache: {
    setPlainNX: jest.Mock;
    del: jest.Mock;
    getJson: jest.Mock;
    writeUserCache: jest.Mock;
    markSession: jest.Mock;
    mapRequestToUser: jest.Mock;
    markOnline: jest.Mock;
  };
  let logger: { info: jest.Mock; error: jest.Mock };

  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(async () => {
    userService = {
      createUser: jest.fn(),
      getByEmail: jest.fn(),
    };
    authService = {
      generateTokens: jest.fn(),
      authByPassword: jest.fn(),
    };
    cache = {
      setPlainNX: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      writeUserCache: jest.fn(),
      markSession: jest.fn(),
      mapRequestToUser: jest.fn(),
      markOnline: jest.fn(),
    };
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
        { provide: CacheHelper, useValue: cache },
        { provide: AppLogger, useValue: logger },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('registers user, issues tokens, and sets refresh cookie', async () => {
    const dto: CreateUserDto = {
      email: '  Test@Example.COM ',
      name: 'Tester',
      password: 'secret',
    };
    const reqId = 'rid-123';
    const user: UserModel = {
      sub: 42,
      email: 'test@example.com',
      name: 'Tester',
    };
    const tokens: TokenModel = {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessJti: 'ajti',
      refreshJti: 'rjti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };
    const res = { cookie: jest.fn() } as any;

    cache.setPlainNX.mockResolvedValue(true);
    userService.createUser.mockResolvedValue(user);
    authService.generateTokens.mockResolvedValue(tokens);

    const result = await controller.registrationUser(dto, reqId, res);

    expect(cache.setPlainNX).toHaveBeenCalledWith(
      'reg:test@example.com',
      reqId,
      30,
    );
    expect(userService.createUser).toHaveBeenCalledWith(
      { requestId: reqId },
      {
        email: 'test@example.com',
        name: 'Tester',
      },
    );
    expect(authService.generateTokens).toHaveBeenCalledWith(
      { requestId: reqId },
      user,
      'secret',
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(cache.del).toHaveBeenCalledWith('reg:test@example.com');
    expect(result).toEqual({ user, tokens });
  });

  it('rejects when registration is already in progress', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
      password: 'secret',
    };
    const reqId = 'rid-123';
    const res = { cookie: jest.fn() } as any;

    cache.setPlainNX.mockResolvedValue(false);

    await expect(
      controller.registrationUser(dto, reqId, res),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userService.createUser).not.toHaveBeenCalled();
    expect(authService.generateTokens).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('rethrows HttpException from user service', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
      password: 'secret',
    };
    const reqId = 'rid-123';
    const res = { cookie: jest.fn() } as any;
    const err = new HttpException('bad request', 400);

    cache.setPlainNX.mockResolvedValue(true);
    userService.createUser.mockRejectedValue(err);

    await expect(controller.registrationUser(dto, reqId, res)).rejects.toBe(
      err,
    );
    expect(authService.generateTokens).not.toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalledWith('reg:test@example.com');
  });

  it('maps unique violation to ConflictException', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
      password: 'secret',
    };
    const reqId = 'rid-123';
    const res = { cookie: jest.fn() } as any;

    cache.setPlainNX.mockResolvedValue(true);
    userService.createUser.mockRejectedValue({ code: '23505' });

    await expect(
      controller.registrationUser(dto, reqId, res),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(cache.del).toHaveBeenCalledWith('reg:test@example.com');
  });

  it('maps token generation failures to InternalServerErrorException', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
      password: 'secret',
    };
    const reqId = 'rid-123';
    const res = { cookie: jest.fn() } as any;
    const user: UserModel = {
      sub: 42,
      email: 'test@example.com',
      name: 'Tester',
    };

    cache.setPlainNX.mockResolvedValue(true);
    userService.createUser.mockResolvedValue(user);
    authService.generateTokens.mockRejectedValue(new Error('token failed'));

    await expect(
      controller.registrationUser(dto, reqId, res),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(authService.generateTokens).toHaveBeenCalledWith(
      { requestId: reqId },
      user,
      'secret',
    );
    expect(cache.del).toHaveBeenCalledWith('reg:test@example.com');
  });

  it('authUser returns tokens using cached user', async () => {
    const dto: AuthUserDto = {
      email: 'Test@Example.COM',
      password: 'secret12',
    };
    const reqId = 'rid-456';
    const res = { cookie: jest.fn() } as any;
    const user: UserModel = {
      sub: 11,
      email: 'test@example.com',
      name: 'Tester',
    };
    const tokens: TokenModel = {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessJti: 'ajti',
      refreshJti: 'rjti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };

    cache.setPlainNX.mockResolvedValue(true);
    cache.getJson.mockResolvedValue(user);
    authService.authByPassword.mockResolvedValue(tokens);

    const result = await controller.authUser(dto, reqId, res);

    expect(cache.setPlainNX).toHaveBeenCalledWith(
      'auth:test@example.com',
      reqId,
      30,
    );
    expect(cache.getJson).toHaveBeenCalledWith('user:email:test@example.com');
    expect(userService.getByEmail).not.toHaveBeenCalled();
    expect(authService.authByPassword).toHaveBeenCalledWith(
      { requestId: reqId },
      { user, password: 'secret12' },
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(cache.writeUserCache).toHaveBeenCalledWith(
      {
        id: user.sub,
        name: user.name,
        email: user.email,
      },
      1800,
    );
    expect(cache.markSession).toHaveBeenCalledWith('ajti', 11, 1800);
    expect(cache.markSession).toHaveBeenCalledWith('rjti', 11, 2592000);
    expect(cache.mapRequestToUser).toHaveBeenCalledWith(reqId, 11);
    expect(cache.markOnline).toHaveBeenCalledWith(11, 60);
    expect(cache.del).toHaveBeenCalledWith('auth:test@example.com');
    expect(result).toEqual({ user, tokens });
  });

  it('authUser falls back to user service on cache miss', async () => {
    const dto: AuthUserDto = {
      email: 'test@example.com',
      password: 'secret12',
    };
    const reqId = 'rid-457';
    const res = { cookie: jest.fn() } as any;
    const user: UserModel = {
      sub: 12,
      email: 'test@example.com',
      name: 'Tester',
    };
    const tokens: TokenModel = {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessJti: 'ajti',
      refreshJti: 'rjti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };

    cache.setPlainNX.mockResolvedValue(true);
    cache.getJson.mockResolvedValue(null);
    userService.getByEmail.mockResolvedValue(user);
    authService.authByPassword.mockResolvedValue(tokens);

    const result = await controller.authUser(dto, reqId, res);

    expect(userService.getByEmail).toHaveBeenCalledWith(
      { requestId: reqId },
      { email: 'test@example.com' },
    );
    expect(result).toEqual({ user, tokens });
    expect(cache.del).toHaveBeenCalledWith('auth:test@example.com');
  });

  it('authUser rejects when user is not found', async () => {
    const dto: AuthUserDto = {
      email: 'test@example.com',
      password: 'secret12',
    };
    const reqId = 'rid-458';
    const res = { cookie: jest.fn() } as any;

    cache.setPlainNX.mockResolvedValue(true);
    cache.getJson.mockResolvedValue(null);
    userService.getByEmail.mockResolvedValue(null);

    await expect(controller.authUser(dto, reqId, res)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.authByPassword).not.toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalledWith('auth:test@example.com');
  });

  it('authUser rethrows HttpException from auth service', async () => {
    const dto: AuthUserDto = {
      email: 'test@example.com',
      password: 'secret12',
    };
    const reqId = 'rid-459';
    const res = { cookie: jest.fn() } as any;
    const user: UserModel = {
      sub: 13,
      email: 'test@example.com',
      name: 'Tester',
    };
    const err = new UnauthorizedException('Invalid credentials');

    cache.setPlainNX.mockResolvedValue(true);
    cache.getJson.mockResolvedValue(user);
    authService.authByPassword.mockRejectedValue(err);

    await expect(controller.authUser(dto, reqId, res)).rejects.toBe(err);
    expect(cache.del).toHaveBeenCalledWith('auth:test@example.com');
  });
});
