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

  async getByEmail(
    meta: { requestId: string },
    params: { email: string },
  ): Promise<UserModel | null> {
    const exists = await rpc<(UserModel & { id: number }) | null>(
      this.users,
      USERS_PATTERNS.GET_BY_EMAIL,
      {
        meta,
        email: params.email,
      },
    );

    if (!exists) return null;
    return this.withSub(exists);
  }

  async findAll(): Promise<UserModel[]> {
    const list = await rpc<Array<UserModel & { id: number }>>(
      this.users,
      USERS_PATTERNS.GET_ALL,
      {},
    );

    return this.withSubList(list);
  }

  async findOne(id: number): Promise<UserModel> {
    const user = await rpc<UserModel & { id: number }>(
      this.users,
      USERS_PATTERNS.GET_BY_ID,
      { id },
    );

    return this.withSub(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserModel> {
    const user = await rpc<UserModel & { id: number }>(
      this.users,
      USERS_PATTERNS.UPDATE,
      { updateUserDto: { ...updateUserDto, id } },
    );

    return this.withSub(user);
  }

  async remove(id: number): Promise<{ id: number }> {
    return await rpc<{ id: number }>(this.users, USERS_PATTERNS.REMOVE, { id });
  }

  async addContributionId(
    meta: { requestId: string },
    userId: number,
    contributionId: number,
  ): Promise<UserModel> {
    const user = await rpc<UserModel & { id: number }>(
      this.users,
      USERS_PATTERNS.ADD_CONTRIBUTION,
      { meta, userId, contributionId },
    );

    return this.withSub(user);
  }

  async removeContributionId(
    meta: { requestId: string },
    userId: number,
    contributionId: number,
  ): Promise<UserModel> {
    const user = await rpc<UserModel & { id: number }>(
      this.users,
      USERS_PATTERNS.REMOVE_CONTRIBUTION,
      { meta, userId, contributionId },
    );

    return this.withSub(user);
  }
}
