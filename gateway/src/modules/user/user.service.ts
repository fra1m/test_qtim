import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { USERS_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { UserModel } from './models/user.model';
import { USERS_PATTERNS } from 'src/contracts/user/users.patterns';

@Injectable()
export class UserService {
  constructor(@Inject(USERS_CLIENT) private readonly users: ClientProxy) {}

  private withSub<T extends { id: number }>(user: T): T & { sub: number } {
    return { ...user, sub: user.id };
  }

  private withSubList<T extends { id: number }>(
    users: T[],
  ): Array<T & { sub: number }> {
    return users.map((user) => this.withSub(user));
  }

  async createUser(
    meta: { requestId: string },
    createUserDto: Omit<CreateUserDto, 'password'>,
  ): Promise<UserModel> {
    const exists = await rpc<UserModel & { id: number }>(
      this.users,
      USERS_PATTERNS.CREATE,
      {
        meta,
        createUserDto,
      },
    );

    return this.withSub(exists);
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
