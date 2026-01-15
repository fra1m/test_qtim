import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheHelper } from './redis.service';
import Redis, { Redis as RedisClient } from 'ioredis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => {
        const { redisStore } = await import('cache-manager-ioredis-yet');
        const host = cfg.get<string>('REDIS_HOST', 'redis');
        const port = Number(cfg.get<string>('REDIS_PORT', '6379'));
        const password = cfg.get<string>('REDIS_PASSWORD') || undefined;

        // ВАЖНО: cache-manager остаётся для HTTP-кэша (интерсептор),
        // но write-through будем делать сырым ioredis-клиентом.
        const store = await redisStore({
          host,
          port,
          password,
          ttl: 60,
          keyPrefix: 'gw:',
        });

        // Просто заметка в лог:
        // console.warn(`[AppCacheModule] wired to redis://${host}:${port} prefix=gw:`);

        return { store };
      },
    }),
  ],
  providers: [
    {
      provide: 'REDIS_RAW',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): RedisClient => {
        const host = cfg.get<string>('REDIS_HOST', 'redis');
        const port = Number(cfg.get<string>('REDIS_PORT', '6379'));
        const password = cfg.get<string>('REDIS_PASSWORD') || undefined;
        const client = new Redis({ host, port, password });
        return client;
      },
    },
    CacheHelper,
  ],
  exports: [CacheModule, CacheHelper, 'REDIS_RAW'],
})
export class AppCacheModule {}
