import { Injectable, VersioningType, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { randomBytes, randomUUID } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationPipe as ContractsValidationPipe } from 'src/common/pipes/validation.pipe';
import type { Request, Response, NextFunction } from 'express';
import { CacheHelper } from './common/redis/redis.service';

@Injectable()
export class AppBootstrapService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly logger: Logger,
    private readonly cache: CacheHelper,
  ) {}

  /** Если REDIS_PASSWORD не задан, но есть файл — подхватим его. */
  preloadSecrets(): void {
    const file = process.env.REDIS_PASSWORD_FILE;
    if (!process.env.REDIS_PASSWORD && file) {
      try {
        const p = path.resolve(file);
        process.env.REDIS_PASSWORD = fs.readFileSync(p, 'utf8').trim();
      } catch (err) {
        // критично падать — решение за тобой
        // здесь логируем и выбрасываем, чтобы не стартовать «немо»
        // можешь заменить на warn + continue

        throw new Error(
          `Failed to load REDIS_PASSWORD from ${file}: ${String(err)}`,
        );
      }
    }
  }

  /** X-Request-Id: взять из заголовка или сгенерировать */
  private requestIdMiddleware() {
    const gen = () => {
      try {
        return randomUUID();
      } catch {
        return randomBytes(16).toString('hex');
      }
    };
    return (req: Request, res: Response, next: NextFunction) => {
      const incoming = String(req.headers['x-request-id'] ?? '').trim();
      const rid = incoming || gen();
      req.headers['x-request-id'] = rid;
      res.setHeader('x-request-id', rid);
      next();
    };
  }

  private parseCorsOrigins(raw?: string): true | string[] {
    if (!raw || raw.trim() === '*') return true;
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : true;
  }

  /** Вешаем middlewares, CORS, versioning, pipes, логи и т.п. */
  configure(app: INestApplication): void {
    // логгер из nestjs-pino
    app.useLogger(this.logger);

    // ловим неотловленные ошибки
    process.on('unhandledRejection', (reason) => {
      this.logger.error({ reason }, 'UNHANDLED_REJECTION');
    });
    process.on('uncaughtException', (err) => {
      this.logger.fatal({ err }, 'UNCAUGHT_EXCEPTION');
      process.exit(1);
    });

    // безопасность и сеть
    app.use(helmet());
    app.use(this.requestIdMiddleware());

    const corsRaw = this.cfg.get<string>('CORS_ORIGIN', { infer: true });
    app.enableCors({
      origin: this.parseCorsOrigins(corsRaw),
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders:
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id',
      exposedHeaders: 'x-request-id',
    });

    // префикс и версии: /api/v1/...
    const prefix = this.cfg.get<string>('API_PREFIX', { infer: true }) ?? 'api';
    app.setGlobalPrefix(prefix);
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    // глобальная валидация (из contracts)
    app.useGlobalPipes(new ContractsValidationPipe());

    app.enableShutdownHooks();
  }

  /** Доп.проверки после старта (инспект стор, пингуем редис, печатаем URL). */
  async afterListen(app: INestApplication): Promise<void> {
    // диагностируем cache store
    try {
      const store: any = (app as any).get('CACHE_MANAGER')?.store;
      this.logger.warn(
        {
          hasGetClient: !!store?.getClient,
          storeKeys: Object.keys(store || {}),
        },
        'cache.store.inspect',
      );
    } catch {
      /* ignore */
    }

    // ping redis
    try {
      const ok = await this.cache.ping();
      this.logger[ok ? 'log' : 'error']({ ok }, 'redis connectivity check');
    } catch (e) {
      this.logger.error({ err: e }, 'redis connectivity check failed');
    }

    // финальный лог
    const url = await app.getUrl();
    const prefix = this.cfg.get<string>('API_PREFIX', { infer: true }) ?? 'api';
    this.logger.log(
      `[${process.env.SERVICE_NAME}] listening on ${url}/${prefix}/v1`,
    );
  }
}
