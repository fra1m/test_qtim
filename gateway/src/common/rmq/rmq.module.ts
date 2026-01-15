import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport, RmqOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const AUTH_CLIENT = 'AUTH_CLIENT';
export const USERS_CLIENT = 'USERS_CLIENT';
export const CONTRIBUTIONS_CLIENT = 'CONTRIBUTIONS_CLIENT';

export function buildRmqOptions(
  cfg: ConfigService,
  queueEnv: string,
  defQueue: string,
): RmqOptions {
  const url = cfg.getOrThrow<string>('RABBITMQ_URL');
  const queue = cfg.get<string>(queueEnv) ?? defQueue;
  const dlx = cfg.get<string>('RMQ_DLX') ?? 'dlx';
  const ttl = Number(cfg.get<string>('RMQ_MESSAGE_TTL_MS'));
  const maxLen = Number(cfg.get<string>('RMQ_MAX_LENGTH'));

  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlx,
          ...(Number.isFinite(ttl) ? { 'x-message-ttl': ttl } : {}),
          ...(Number.isFinite(maxLen) ? { 'x-max-length': maxLen } : {}),
        },
      },
      persistent: true,
    },
  };
}

function registerRmqClient(token: string, queueEnv: string, defQueue: string) {
  return ClientsModule.registerAsync([
    {
      name: token,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): RmqOptions =>
        buildRmqOptions(cfg, queueEnv, defQueue),
    },
  ]);
}

@Module({})
export class RmqModule {
  static forServices(): DynamicModule {
    const auth = registerRmqClient(AUTH_CLIENT, 'RMQ_AUTH_QUEUE', 'auth');
    const users = registerRmqClient(USERS_CLIENT, 'RMQ_USERS_QUEUE', 'users');
    const contributions = registerRmqClient(
      CONTRIBUTIONS_CLIENT,
      'RMQ_CONTRIBUTIONS_QUEUE',
      'contributions',
    );

    return {
      module: RmqModule,
      imports: [ConfigModule, auth, users, contributions],
      exports: [auth, users, contributions],
    };
  }

  // Точечные фабрики — внутри feature-модулей
  static forAuth(): DynamicModule {
    const auth = registerRmqClient(AUTH_CLIENT, 'RMQ_AUTH_QUEUE', 'auth');
    return {
      module: RmqModule,
      imports: [ConfigModule, auth],
      exports: [auth],
    };
  }

  static forUser(): DynamicModule {
    const users = registerRmqClient(USERS_CLIENT, 'RMQ_USERS_QUEUE', 'users');
    return {
      module: RmqModule,
      imports: [ConfigModule, users],
      exports: [users],
    };
  }

  static forContribution(): DynamicModule {
    const contributions = registerRmqClient(
      CONTRIBUTIONS_CLIENT,
      'RMQ_CONTRIBUTIONS_QUEUE',
      'contributions',
    );
    return {
      module: RmqModule,
      imports: [ConfigModule, contributions],
      exports: [contributions],
    };
  }
}
