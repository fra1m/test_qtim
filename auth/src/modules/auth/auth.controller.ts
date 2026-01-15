import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { AUTH_PATTERNS } from 'src/contracts/auth.patterns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserModel } from 'src/common/models/user.model';

@Controller()
export class AuthController {
  constructor(
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
    private readonly authService: AuthService,
  ) {}

  @MessagePattern(AUTH_PATTERNS.GENERATE_TOKENS)
  async issueTokens(
    @Payload()
    data: {
      meta: { requestId: string };
      user: UserModel;
      password?: string;
    },
  ) {
    this.logger.info(
      {
        rid: data.meta?.requestId,
        user: data.user,
      },
      AUTH_PATTERNS.GENERATE_TOKENS,
    );

    try {
      const tokens = await this.authService.generateTokens(
        data.user,
        data.password,
      );
      // внутри generateTokens — сохранить refresh
      return tokens;
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        AUTH_PATTERNS.GENERATE_TOKENS,
      );
      throw new RpcException({
        message: e?.message ?? 'Generate tokens failed',
      });
    }
  }

  @MessagePattern(AUTH_PATTERNS.AUTH_BY_PASSWORD)
  async loginByPassword(
    @Payload()
    data: {
      meta: { requestId: string };
      user: UserModel;
      password: string;
    },
  ) {
    this.logger.info(
      { rid: data.meta?.requestId, userId: data.user?.sub },
      AUTH_PATTERNS.AUTH_BY_PASSWORD,
    );
    try {
      return await this.authService.loginByPassword({
        user: data.user,
        password: data.password,
      });
    } catch (e: any) {
      this.logger.warn(
        { rid: data.meta?.requestId, userId: data.user?.sub, err: e?.message },
        AUTH_PATTERNS.AUTH_BY_PASSWORD,
      );

      throw new RpcException({ message: 'Invalid credentials', status: 401 });
    }
  }
}
