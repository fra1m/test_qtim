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

  @MessagePattern('findAllAuth')
  findAll() {
    return this.authService.findAll();
  }

  @MessagePattern('findOneAuth')
  findOne(@Payload() id: number) {
    return this.authService.findOne(id);
  }

  @MessagePattern('updateAuth')
  update(@Payload() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(updateAuthDto.id, updateAuthDto);
  }

  @MessagePattern('removeAuth')
  remove(@Payload() id: number) {
    return this.authService.remove(id);
  }
}
