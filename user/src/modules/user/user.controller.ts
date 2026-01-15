import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { USERS_PATTERNS } from 'src/contracts/users.patterns';

@Controller()
export class UserController {
  constructor(
    @InjectPinoLogger(UserController.name)
    private readonly logger: PinoLogger,
    private readonly userService: UserService,
  ) {}

  @MessagePattern(USERS_PATTERNS.CREATE)
  async create(
    @Payload()
    data: {
      meta: { requestId: string };
      createUserDto: CreateUserDto;
    },
  ) {
    this.logger.info(
      {
        rid: data.meta?.requestId,
        dto: { ...data.createUserDto, password: '[REDACTED]' },
      },
      `${USERS_PATTERNS.CREATE} received`,
    );

    try {
      const user = await this.userService.createUser(data.createUserDto);

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${USERS_PATTERNS.CREATE} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Create users failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.GET_ALL)
  async getAll(@Payload() data: { meta: { requestId: string } }) {
    this.logger.info(
      { rid: data.meta?.requestId },
      `${USERS_PATTERNS.GET_ALL} received`,
    );

    try {
      return await this.userService.getAllUsers();
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${USERS_PATTERNS.GET_ALL} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Get all users failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.GET_BY_ID)
  async getUserById(
    @Payload() data: { meta: { requestId: string }; id: number },
  ) {
    this.logger.info(
      {
        rid: data.meta?.requestId,
        dto: data.id,
      },
      `${USERS_PATTERNS.GET_BY_ID} received`,
    );

    try {
      const user = await this.userService.getUserById(data.id);

      this.logger.info(
        { rid: data.meta?.requestId, user },
        `${USERS_PATTERNS.GET_BY_ID} succeeded`,
      );

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${USERS_PATTERNS.GET_BY_ID} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Get user failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.GET_BY_EMAIL)
  async getUserByEmail(
    @Payload() data: { meta: { requestId: string }; email: string },
  ) {
    this.logger.info(
      {
        rid: data.meta?.requestId,
        dto: data.email,
      },
      `${USERS_PATTERNS.GET_BY_EMAIL} received`,
    );

    try {
      const user = await this.userService.getUserByEmail(data.email);

      if (!user) {
        this.logger.info(
          { rid: data.meta?.requestId, email: data.email },
          `${USERS_PATTERNS.GET_BY_EMAIL} not found`,
        );
        return null;
      }

      this.logger.info(
        { rid: data.meta?.requestId, user },
        `${USERS_PATTERNS.GET_BY_EMAIL} succeeded`,
      );

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${USERS_PATTERNS.GET_BY_EMAIL} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Get user failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.UPDATE)
  async update(
    @Payload()
    data: {
      meta?: { requestId: string };
      updateUserDto: UpdateUserDto;
    },
  ) {
    const updateUserDto = data.updateUserDto;
    const requestId = data.meta?.requestId;

    this.logger.info(
      {
        rid: requestId,
        dto: updateUserDto,
      },
      `${USERS_PATTERNS.UPDATE} received`,
    );

    try {
      const user = await this.userService.updateUser(
        updateUserDto.id,
        updateUserDto,
      );

      this.logger.info(
        { rid: requestId, user },
        `${USERS_PATTERNS.UPDATE} succeeded`,
      );

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: requestId, err: e },
        `${USERS_PATTERNS.UPDATE} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Update user failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.REMOVE)
  async remove(@Payload() data: { meta?: { requestId: string }; id: number }) {
    const userId = data.id;
    const requestId = data.meta?.requestId;

    this.logger.info(
      {
        rid: requestId,
        dto: userId,
      },
      `${USERS_PATTERNS.REMOVE} received`,
    );

    try {
      const result = await this.userService.removeUser(userId);

      this.logger.info(
        { rid: requestId, result },
        `${USERS_PATTERNS.REMOVE} succeeded`,
      );

      return result;
    } catch (e: any) {
      this.logger.error(
        { rid: requestId, err: e },
        `${USERS_PATTERNS.REMOVE} failed`,
      );
      throw new RpcException({ message: e?.message ?? 'Remove user failed' });
    }
  }

  @MessagePattern(USERS_PATTERNS.ADD_CONTRIBUTION)
  async addContribution(
    @Payload()
    data: {
      meta?: { requestId: string };
      userId: number;
      contributionId: number;
    },
  ) {
    const requestId = data.meta?.requestId;

    this.logger.info(
      {
        rid: requestId,
        userId: data.userId,
        contributionId: data.contributionId,
      },
      `${USERS_PATTERNS.ADD_CONTRIBUTION} received`,
    );

    try {
      const user = await this.userService.addContribution(
        data.userId,
        data.contributionId,
      );

      this.logger.info(
        {
          rid: requestId,
          userId: data.userId,
          contributionId: data.contributionId,
        },
        `${USERS_PATTERNS.ADD_CONTRIBUTION} succeeded`,
      );

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: requestId, err: e },
        `${USERS_PATTERNS.ADD_CONTRIBUTION} failed`,
      );
      throw new RpcException({
        message: e?.message ?? 'Add contribution failed',
      });
    }
  }

  @MessagePattern(USERS_PATTERNS.REMOVE_CONTRIBUTION)
  async removeContribution(
    @Payload()
    data: {
      meta?: { requestId: string };
      userId: number;
      contributionId: number;
    },
  ) {
    const requestId = data.meta?.requestId;

    this.logger.info(
      {
        rid: requestId,
        userId: data.userId,
        contributionId: data.contributionId,
      },
      `${USERS_PATTERNS.REMOVE_CONTRIBUTION} received`,
    );

    try {
      const user = await this.userService.removeContribution(
        data.userId,
        data.contributionId,
      );

      this.logger.info(
        {
          rid: requestId,
          userId: data.userId,
          contributionId: data.contributionId,
        },
        `${USERS_PATTERNS.REMOVE_CONTRIBUTION} succeeded`,
      );

      return user;
    } catch (e: any) {
      this.logger.error(
        { rid: requestId, err: e },
        `${USERS_PATTERNS.REMOVE_CONTRIBUTION} failed`,
      );
      throw new RpcException({
        message: e?.message ?? 'Remove contribution failed',
      });
    }
  }
}
