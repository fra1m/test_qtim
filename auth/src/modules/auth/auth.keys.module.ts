import * as fs from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AUTH_ACCESS_PRIVATE_KEY,
  AUTH_ACCESS_PUBLIC_KEY,
  AUTH_REFRESH_PRIVATE_KEY,
  AUTH_REFRESH_PUBLIC_KEY,
  AUTH_TOKEN_PEPPER,
} from 'src/common/constants/auth.constants';

function readKey(
  cfg: ConfigService,
  envPath: string,
  envInline: string,
  envBase64: string,
): string {
  const p = cfg.get<string>(envPath);
  if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8');

  const b64 = cfg.get<string>(envBase64);
  if (b64) return Buffer.from(b64, 'base64').toString('utf8');

  const inline = cfg.get<string>(envInline);
  if (inline) return inline.replace(/\\n/g, '\n');

  throw new Error(`Missing key: ${envPath} | ${envInline} | ${envBase64}`);
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AUTH_ACCESS_PRIVATE_KEY,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        readKey(
          cfg,
          'JWT_PRIVATE_KEY_PATH',
          'JWT_PRIVATE_KEY',
          'JWT_PRIVATE_KEY_B64',
        ),
    },
    {
      provide: AUTH_ACCESS_PUBLIC_KEY,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        readKey(
          cfg,
          'JWT_PUBLIC_KEY_PATH',
          'JWT_PUBLIC_KEY',
          'JWT_PUBLIC_KEY_B64',
        ),
    },
    {
      provide: AUTH_REFRESH_PRIVATE_KEY,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        readKey(
          cfg,
          'JWT_REFRESH_PRIVATE_KEY_PATH',
          'JWT_REFRESH_PRIVATE_KEY',
          'JWT_REFRESH_PRIVATE_KEY_B64',
        ),
    },
    {
      provide: AUTH_REFRESH_PUBLIC_KEY,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        readKey(
          cfg,
          'JWT_REFRESH_PUBLIC_KEY_PATH',
          'JWT_REFRESH_PUBLIC_KEY',
          'JWT_REFRESH_PUBLIC_KEY_B64',
        ),
    },
    {
      provide: AUTH_TOKEN_PEPPER,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const pepper = cfg.get<string>('TOKEN_PEPPER') ?? '';
        if (!pepper) {
          throw new Error('Missing TOKEN_PEPPER');
        }
        return pepper;
      },
    },
  ],
  exports: [
    AUTH_ACCESS_PRIVATE_KEY,
    AUTH_ACCESS_PUBLIC_KEY,
    AUTH_REFRESH_PRIVATE_KEY,
    AUTH_REFRESH_PUBLIC_KEY,
    AUTH_TOKEN_PEPPER,
  ],
})
export class AuthKeysModule {}
