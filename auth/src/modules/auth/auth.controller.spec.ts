import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getLoggerToken } from 'nestjs-pino';
import { AUTH_PATTERNS } from 'src/contracts/auth.patterns';
import { UserModel } from 'src/common/models/user.model';
import { IssuedTokens } from 'src/common/models/token.model';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    generateTokens: jest.Mock<Promise<IssuedTokens>, any>;
    loginByPassword: jest.Mock<Promise<IssuedTokens>, any>;
  };
  let logger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };

  const user: UserModel = {
    sub: 42,
    email: 'user@example.com',
    name: 'User',
  };

  beforeEach(async () => {
    authService = {
      generateTokens: jest.fn(),
      loginByPassword: jest.fn(),
    };
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: getLoggerToken(AuthController.name), useValue: logger },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('issueTokens returns tokens from service', async () => {
    const tokens: IssuedTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessJti: 'access-jti',
      refreshJti: 'refresh-jti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };
    authService.generateTokens.mockResolvedValue(tokens);

    const result = await controller.issueTokens({
      meta: { requestId: 'rid-1' },
      user,
      password: 'secret',
    });

    expect(result).toBe(tokens);
    expect(authService.generateTokens).toHaveBeenCalledWith(user, 'secret');
    expect(logger.info).toHaveBeenCalledWith(
      { rid: 'rid-1', user },
      AUTH_PATTERNS.GENERATE_TOKENS,
    );
  });

  it('issueTokens wraps errors in RpcException', async () => {
    authService.generateTokens.mockRejectedValue(new Error('boom'));

    try {
      await controller.issueTokens({
        meta: { requestId: 'rid-2' },
        user,
      });
      fail('Expected RpcException');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      expect((err as RpcException).getError()).toEqual({ message: 'boom' });
      expect(logger.error).toHaveBeenCalledWith(
        { rid: 'rid-2', err: expect.any(Error) },
        AUTH_PATTERNS.GENERATE_TOKENS,
      );
    }
  });

  it('loginByPassword returns tokens from service', async () => {
    const tokens: IssuedTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessJti: 'access-jti',
      refreshJti: 'refresh-jti',
      accessTtlSec: 1800,
      refreshTtlSec: 2592000,
    };
    authService.loginByPassword.mockResolvedValue(tokens);

    const result = await controller.loginByPassword({
      meta: { requestId: 'rid-3' },
      user,
      password: 'secret',
    });

    expect(result).toBe(tokens);
    expect(authService.loginByPassword).toHaveBeenCalledWith({
      user,
      password: 'secret',
    });
    expect(logger.info).toHaveBeenCalledWith(
      { rid: 'rid-3', userId: user.sub },
      AUTH_PATTERNS.AUTH_BY_PASSWORD,
    );
  });

  it('loginByPassword wraps errors in RpcException with 401 status', async () => {
    authService.loginByPassword.mockRejectedValue(new Error('bad creds'));

    try {
      await controller.loginByPassword({
        meta: { requestId: 'rid-4' },
        user,
        password: 'secret',
      });
      fail('Expected RpcException');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      expect((err as RpcException).getError()).toEqual({
        message: 'Invalid credentials',
        status: 401,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        { rid: 'rid-4', userId: user.sub, err: 'bad creds' },
        AUTH_PATTERNS.AUTH_BY_PASSWORD,
      );
    }
  });
});
