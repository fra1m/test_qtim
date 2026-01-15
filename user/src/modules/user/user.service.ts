import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  private async validateNewUser(email: string) {
    const candidate = await this.getUserByEmail(email);

    if (candidate) {
      throw new HttpException(
        'Пользователь с таким email существует!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    return user;
  }

  async getUserByEmailOrFail(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new HttpException('Пользователь не найден!', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    await this.validateNewUser(createUserDto.email);

    const user = await this.userRepository.save(createUserDto);

    return user;
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('Пользователь не найден!', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async getAllUsers() {
    return await this.userRepository.find();
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const candidate = await this.getUserByEmail(updateUserDto.email);
      if (candidate && candidate.id !== userId) {
        throw new HttpException(
          'Пользователь с таким email существует!',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const user = await this.userRepository.preload({
      ...updateUserDto,
      id: userId,
    });

    if (!user) {
      throw new HttpException('Пользователь не найден!', HttpStatus.NOT_FOUND);
    }

    return await this.userRepository.save(user);
  }

  async removeUser(userId: number) {
    const result = await this.userRepository.delete(userId);

    if (!result.affected) {
      throw new HttpException('Пользователь не найден!', HttpStatus.NOT_FOUND);
    }

    return { id: userId };
  }
}
