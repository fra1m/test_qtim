import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envSchema } from './common/config/validation';
import { ContributionModule } from './modules/contribution/contribution.module';
import { join } from 'path';

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
      useFactory: (cfg: ConfigService) => {
        const isProd =
          cfg.get<string>('NODE_ENV', { infer: true }) === 'production';
        const migrationsRunRaw = cfg.get('TYPEORM_MIGRATIONS_RUN');
        const migrationsRun =
          typeof migrationsRunRaw === 'boolean'
            ? migrationsRunRaw
            : typeof migrationsRunRaw === 'string'
              ? migrationsRunRaw.toLowerCase() === 'true'
              : !isProd;

        return {
          type: 'postgres',
          host: cfg.get<string>('POSTGRES_HOST', { infer: true }),
          port: Number(cfg.get<number>('POSTGRES_PORT', { infer: true })),
          database: cfg.get<string>('POSTGRES_DB', { infer: true }),
          username: cfg.get<string>('POSTGRES_USER', { infer: true }),
          password: cfg.get<string>('POSTGRES_PASSWORD', { infer: true }),
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun,
          migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
          maxQueryExecutionTime: 500,
        };
      },
    }),
    ContributionModule,
  ],
})
export class AppModule {}
