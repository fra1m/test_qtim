import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserModel } from 'src/modules/user/models/user.model';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectPinoLogger('JWT Auth Guard') private readonly logger: PinoLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>() as Request & {
      user?: UserModel;
    };
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new HttpException(
        'Вам необходимо авторизоваться',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new HttpException(
        'Вам необходимо авторизоваться',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const user = this.jwtService.verify<UserModel>(token);

      req.user = user;
      return true;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new HttpException('Токен истек', HttpStatus.UNAUTHORIZED);
      }
      this.logger.error(err.message, err.status);

      throw new HttpException(err.message, HttpStatus.FORBIDDEN);
    }
  }
}
