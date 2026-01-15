import { Module } from '@nestjs/common';
import { AppBootstrapService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './common/config/validation';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './common/redis/http-cache.interceptor';
import { UserModule } from './modules/user/user.module';
import { AppCacheModule } from './common/redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath:
        process.env.NODE_ENV === 'production' ? [] : ['.env', '../.env'],
      expandVariables: true,
    }),
    LoggerModule,
    AppCacheModule,
    UserModule,
  ],
  providers: [
    AppBootstrapService,
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor }, // 👈 добавили
  ],
})
export class AppModule {}
