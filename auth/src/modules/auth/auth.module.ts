import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from './entities/auth.entity';
import { AuthKeysModule } from './auth.keys.module';
import {
  AUTH_ACCESS_PRIVATE_KEY,
  AUTH_ACCESS_PUBLIC_KEY,
} from '../../common/constants/auth.constants';

@Module({
  imports: [
    ConfigModule,
    AuthKeysModule,
    TypeOrmModule.forFeature([TokenEntity]),
    JwtModule.registerAsync({
      imports: [AuthKeysModule],
      inject: [AUTH_ACCESS_PRIVATE_KEY, AUTH_ACCESS_PUBLIC_KEY],
      useFactory: (privateKey: string, publicKey: string) => {
        return {
          privateKey,
          publicKey,
          signOptions: { algorithm: 'RS256' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
