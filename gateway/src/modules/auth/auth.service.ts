import { Inject, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { UserModel } from '../user/models/user.model';
import { TokenModel } from './models/token.model';
import { AUTH_PATTERNS } from 'src/contracts/auth/auth.patterns';

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_CLIENT) private readonly auth: ClientProxy) {}

  async generateTokens(
    meta: { requestId: string },
    user: UserModel,
    password?: string,
  ): Promise<TokenModel> {
    return await rpc<TokenModel>(
      this.auth,
      AUTH_PATTERNS.AUTH_GENERATE_TOKENS,
      {
        meta,
        user,
        password,
      },
    );
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
