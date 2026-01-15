import * as fs from 'fs';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoggerModule } from 'src/common/logger/logger.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const fromPath = cfg.get<string>('JWT_PUBLIC_KEY_PATH');
        const fromEnv = cfg.get<string>('JWT_PUBLIC_KEY');
        const publicKey = fromPath
          ? fs.readFileSync(fromPath, 'utf8')
          : (fromEnv ?? '').replace(/\\n/g, '\n');

        if (!publicKey) {
          throw new Error('JWT public key is missing (JWT_PUBLIC_KEY[_PATH])');
        }
        return {
          publicKey,
          verifyOptions: { algorithms: ['RS256'] }, // важно: RS256
        };
      },
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SecurityModule {}
