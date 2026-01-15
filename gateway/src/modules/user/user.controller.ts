import { Response } from 'express';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserModel } from './models/user.model';
import { TokenModel } from '../auth/models/token.model';
import { ReqId } from 'src/common/http/req-id.decorator';
import { CacheHelper } from 'src/common/redis/redis.service';
import { AppLogger } from 'src/common/logger/logger.service';
import { AuthService } from '../auth/auth.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly cache: CacheHelper,
    private readonly logger: AppLogger,
  ) {}

  @Post('/registration')
  async registrationUser(
    @Body() dto: CreateUserDto,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserModel; tokens: TokenModel }> {
    const meta = { requestId: reqId };
    const { password, ...userData } = dto;
    const email = userData.email.trim().toLowerCase();

    const lockKey = `reg:${email}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }
    this.logger.info({ rid: reqId, dto }, 'users.registration started');
    try {
      const created = await this.userService.createUser(meta, {
        ...userData,
        email,
      });

      const tokens = await this.authService.generateTokens(
        meta,
        created,
        password,
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      this.logger.info(
        { rid: reqId, id: created.sub },
        'users.registration done',
      );
      return { user: created, tokens };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.registration failed');
      if (e instanceof HttpException) throw e;

      if (e?.code === '23505') {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Registration failed');
    } finally {
      await this.cache.del(lockKey);
    }
  }

//   @Post('/login')
//   async authUser(
//     @Body() dto: AuthUserDto,
//     @ReqId() reqId: string,
//     @Res({ passthrough: true }) res: Response,
//   ): Promise<{
//     user: UserModel;
//     tokens: Tokens;
//   }> {
//     const meta = { requestId: reqId };
//     const email = dto.email.trim().toLowerCase();
//     const password = dto.password;

//     const lockKey = `auth:${email}`;
//     const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
//     if (!lockOk) {
//       throw new ConflictException('Registration in progress for this email');
//     }

//     this.logger.info({ rid: reqId, email }, 'users.auth started');
//     try {
//       // 1) user из кэша → БД при промахе
//       const cacheKey = `user:email:${email}`;
//       const cached = await this.cache.getJson<UserModel>(cacheKey);
//       let user = cached && cached.sub ? cached : null;
//       if (!user) {
//         user = await this.usersService.getByEmail(meta, { email });
//         if (!user)
//           throw new UnauthorizedException('Не верный логин или пароль');
//       }
//       if (!user.sub) {
//         throw new InternalServerErrorException('User id is missing');
//       }

//       // 2) проверка пароля в auth-сервисе
//       const tokens = await this.authService.authByPassword(meta, {
//         user,
//         password,
//       });

//       // 3) кука с refresh
//       const isProd = process.env.NODE_ENV === 'production';
//       res.cookie('refreshToken', tokens.refreshToken, {
//         httpOnly: true,
//         secure: isProd,
//         sameSite: isProd ? 'none' : 'lax',
//         path: '/',
//         maxAge: 30 * 24 * 60 * 60 * 1000,
//       });

//       // 4) прогреваем кэш пользователя (safe snapshot)
//       await this.cache.writeUserCache(
//         {
//           id: user.sub,
//           name: user.name,
//           email: user.email,
//         },
//         1800,
//       );

//       // 5) метки сессии (по JTI), если они есть в токенах
//       //    это позволит делать logout/ревокацию/онлайн-индикатор
//       if (tokens.accessJti) {
//         await this.cache.markSession(
//           tokens.accessJti,
//           user.sub,
//           tokens.accessTtlSec ?? 900,
//         );
//       }
//       if (tokens.refreshJti) {
//         await this.cache.markSession(
//           tokens.refreshJti,
//           user.sub,
//           tokens.refreshTtlSec ?? 30 * 24 * 3600,
//         );
//       }

//       await this.cache.mapRequestToUser(reqId, user.sub);
//       await this.cache.markOnline(user.sub, 60);

//       this.logger.info({ rid: reqId, id: user.sub }, 'users.auth done');
//       return { user, tokens };
//     } catch (e) {
//       this.logger.error({ rid: reqId, err: e }, 'users.auth failed');
//       if (e instanceof HttpException) throw e;
//       throw new UnauthorizedException('Invalid credentials');
//     } finally {
//       await this.cache.del(lockKey);
//     }
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.userService.findOne(+id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
//     return this.userService.update(+id, updateUserDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.userService.remove(+id);
//   }
// }
