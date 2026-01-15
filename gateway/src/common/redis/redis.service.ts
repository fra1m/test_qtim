import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import IORedis from 'ioredis';

const PREFIX = 'gw:'; // чтобы ключи группировались в RedisInsight

const k = {
  userById: (id: number) => `${PREFIX}user:id:${id}`,
  userByEmail: (email: string) => `${PREFIX}user:email:${email}`,
  reqMap: (rid: string) => `${PREFIX}req:${rid}`,
};

@Injectable()
export class CacheHelper {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache, // оставляем для HTTP-кэша (интерсептор)
    @Inject('REDIS_RAW') private readonly redis: IORedis, // сырой клиент для write-through
    @InjectPinoLogger(CacheHelper.name) private readonly logger: PinoLogger,
  ) {
    // Берём параметры из process.env, чтобы совпадали с CacheModule
    this.redis = new IORedis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      // желательно такой же keyPrefix не ставить здесь, мы префиксуем вручную
    });
  }

  async ping(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.redis.set(`${PREFIX}__ping__`, '1', 'EX', 1);
      await this.redis.del(`${PREFIX}__ping__`);
      this.logger.debug({ dt: Date.now() - start }, 'redis.ping ok');
      return true;
    } catch (e) {
      this.logger.error({ err: e }, 'redis.ping failed');
      return false;
    }
  }

  // --- ПРЯМАЯ запись в Redis (видна в RedisInsight) ---
  async setJson<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    const start = Date.now();
    const fullKey = `${PREFIX}${key}`;
    const payload = JSON.stringify(value);
    try {
      if (ttlSec && ttlSec > 0) {
        await this.redis.set(fullKey, payload, 'EX', ttlSec);
      } else {
        await this.redis.set(fullKey, payload);
      }
      this.logger.debug(
        { key: fullKey, ttlSec, size: payload.length, dt: Date.now() - start },
        'redis.set ok',
      );
    } catch (e) {
      this.logger.error({ key: fullKey, ttlSec, err: e }, 'redis.set failed');
      throw e;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const start = Date.now();
    const fullKey = `${PREFIX}${key}`;
    try {
      const raw = await this.redis.get(fullKey);
      const val = raw ? (JSON.parse(raw) as T) : null;
      this.logger.debug(
        { key: fullKey, hit: !!raw, dt: Date.now() - start },
        'redis.get',
      );
      return val;
    } catch (e) {
      this.logger.error({ key: fullKey, err: e }, 'redis.get failed');
      return null;
    }
  }

  async del(key: string): Promise<void> {
    const fullKey = `${PREFIX}${key}`;
    try {
      await this.redis.del(fullKey);
      this.logger.debug({ key: fullKey }, 'redis.del ok');
    } catch (e) {
      this.logger.error({ key: fullKey, err: e }, 'redis.del failed');
    }
  }

  // прямой доступ к redis для атомарных флагов/локов
  async setPlain(key: string, value: string, ttlSec?: number) {
    const client = this.redis;
    const fullKey = `${PREFIX}${key}`;
    if (!client) {
      // fallback через cache (без NX)
      await this.cache.set(key, value, ttlSec ?? undefined);
      return;
    }
    if (ttlSec) await client.set(fullKey, value, 'EX', ttlSec);
    else await client.set(fullKey, value);
    this.logger.debug({ key: fullKey, ttlSec }, 'redis.set (plain) ok');
  }

  async getPlain(key: string): Promise<string | null> {
    const client = this.redis;
    const fullKey = `${PREFIX}${key}`;
    if (!client) return (await this.cache.get<string>(key)) ?? null;
    const v = await client.get(fullKey);
    return v ?? null;
  }

  // SET NX EX — для рег. локов, anti-duplicate и пр.
  async setPlainNX(
    key: string,
    value: string,
    ttlSec: number,
  ): Promise<boolean> {
    const client = this.redis;
    const fullKey = `${PREFIX}${key}`;
    if (!client) {
      // cache-manager не даёт NX, поэтому просто вернём false (чтобы не ломать семантику)
      this.logger.warn({ key }, 'redis.set NX not supported by fallback store');
      return false;
    }
    const res = await client.set(fullKey, value, 'EX', ttlSec, 'NX');
    const ok = res === 'OK';
    this.logger.debug({ key: fullKey, ttlSec, ok }, 'redis.set NX');
    return ok;
  }

  /** Проверка: есть ли пользователь с таким email в кеше (и мгновенный отказ) */
  async ensureEmailFree(emailRaw: string): Promise<void> {
    const email = emailRaw.trim().toLowerCase();
    const hit = await this.cache.get<string>(k.userByEmail(email));
    if (hit) {
      this.logger.debug({ email }, 'cache.email hit → conflict');
      throw new ConflictException('User with this email already exists');
    }
  }

  // ——— высокоуровневые помощники ———

  async writeUserCache(
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
      sub?: number;
    },
    ttlSec = 1800,
  ) {
    const payload = { ...user, sub: user.sub ?? user.id };
    await this.setJson(`user:id:${user.id}`, payload, ttlSec);
    await this.setJson(
      `user:email:${user.email.toLowerCase()}`,
      payload,
      ttlSec,
    );
  }

  async markSession(jti: string, userId: number, ttlSec: number) {
    // access/refresh jti -> userId
    await this.setPlain(`sess:${jti}`, String(userId), ttlSec);
  }

  async isSessionActive(jti: string): Promise<boolean> {
    const v = await this.getPlain(`sess:${jti}`);
    return !!v;
  }

  async revokeSession(jti: string) {
    const client = this.redis;
    const full = `${PREFIX}sess:${jti}`;
    if (client) await client.del(full);
    else await this.cache.del(`sess:${jti}`);
  }

  async markOnline(userId: number, ttlSec = 60) {
    await this.setPlain(`online:${userId}`, String(Date.now()), ttlSec);
  }

  async mapRequestToUser(reqId: string, userId: number, ttlSec = 900) {
    await this.setPlain(`req:${reqId}`, String(userId), ttlSec);
  }

  // async invalidateUsersPublic() {
  //   // без SCAN (не всегда доступно) — ничего не делаем; SCAN ты уже логируешь
  //   // если понадобится — вынесем ключи списков в фиксированные имена и удалим их напрямую
  //   this.logger.debug({}, 'invalidateUsersPublic noop (no scan)');
  // }
}
