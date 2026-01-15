import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { getLoggerToken } from 'nestjs-pino';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: { getUserByEmail: jest.Mock; createUser: jest.Mock };

  beforeEach(async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    userService = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: getLoggerToken(UserController.name), useValue: logger },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getUserByEmail returns null when user is missing', async () => {
    userService.getUserByEmail.mockResolvedValue(null);

    const result = await controller.getUserByEmail({
      meta: { requestId: 'rid-1' },
      email: 'missing@example.com',
    });

    expect(result).toBeNull();
    expect(userService.getUserByEmail).toHaveBeenCalledWith(
      'missing@example.com',
    );
  });

  it('create returns user when service succeeds', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
    };
    const user = { id: 1, email: 'test@example.com', name: 'Tester' };
    userService.createUser.mockResolvedValue(user);

    const result = await controller.create({
      meta: { requestId: 'rid-3' },
      createUserDto: dto,
    });

    expect(result).toBe(user);
    expect(userService.createUser).toHaveBeenCalledWith(dto);
  });

  it('create wraps errors in RpcException', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
    };
    userService.createUser.mockRejectedValue(new Error('boom'));

    try {
      await controller.create({
        meta: { requestId: 'rid-4' },
        createUserDto: dto,
      });
      fail('Expected RpcException');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      expect((err as RpcException).getError()).toEqual({ message: 'boom' });
    }
  });

  it('getUserByEmail returns user when found', async () => {
    const user = { id: 1, email: 'test@example.com', name: 'Tester' };
    userService.getUserByEmail.mockResolvedValue(user);

    const result = await controller.getUserByEmail({
      meta: { requestId: 'rid-2' },
      email: 'test@example.com',
    });

    expect(result).toBe(user);
    expect(userService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('getUserByEmail wraps errors in RpcException', async () => {
    userService.getUserByEmail.mockRejectedValue(new Error('fail'));

    try {
      await controller.getUserByEmail({
        meta: { requestId: 'rid-5' },
        email: 'test@example.com',
      });
      fail('Expected RpcException');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcException);
      expect((err as RpcException).getError()).toEqual({ message: 'fail' });
    }
  });
});
