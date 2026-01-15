import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envSchema } from './common/config/validation';
import { ContributionModule } from './modules/contribution/contribution.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath:
        process.env.NODE_ENV === 'production' ? [] : ['.env', '../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('POSTGRES_HOST', { infer: true }),
        port: Number(cfg.get<number>('POSTGRES_PORT', { infer: true })),
        database: cfg.get<string>('POSTGRES_DB', { infer: true }),
        username: cfg.get<string>('POSTGRES_USER', { infer: true }),
        password: cfg.get<string>('POSTGRES_PASSWORD', { infer: true }),
        autoLoadEntities: true,
        synchronize: cfg.get<string>('NODE_ENV') !== 'production',
        maxQueryExecutionTime: 500,
      }),
    }),
    ContributionModule,
  ],
})
export class AppModule {}
