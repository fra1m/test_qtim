import * as request from 'supertest';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import * as fs from 'node:fs';
import * as path from 'node:path';

const normalizeBaseUrl = (raw: string): string => raw.replace(/\/+$/, '');

const normalizePrefix = (raw: string): string => {
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return `/${trimmed}`;
};

const loadEnvFile = (filePath: string): void => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
};

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../docker/gateway/.env'),
];
for (const file of envCandidates) loadEnvFile(file);

const baseUrl = normalizeBaseUrl(
  process.env.E2E_BASE_URL ?? 'http://localhost:3000',
);
const apiPrefix = normalizePrefix(process.env.E2E_API_PREFIX ?? 'api/v1');
const registrationPath = `${apiPrefix}/user/registration`;
const loginPath = `${apiPrefix}/user/login`;
const contributionPath = `${apiPrefix}/contribution`;

const REDIS_PREFIX = 'gw:';
const REDIS_VERSION_KEY = `${REDIS_PREFIX}contrib:list:version`;

const makeEmail = (): string => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `User+${Date.now()}-${rand}@Example.com`;
};

const registerUserWithTokens = async (
  email: string,
  password: string,
): Promise<any> => {
  const payload = {
    email,
    name: 'User',
    password,
  };

  const res = await request(baseUrl)
    .post(registrationPath)
    .set('x-request-id', randomUUID())
    .send(payload)
    .expect(201);

  return res.body;
};

const buildListCacheKey = (
  version: string,
  query: Record<string, unknown>,
): string => {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${REDIS_PREFIX}contrib:list:${version}${qs ? `?${qs}` : ''}`;
};

const connectRedis = async (): Promise<Redis> => {
  const host =
    process.env.E2E_REDIS_HOST ?? process.env.REDIS_HOST ?? '127.0.0.1';
  const port = Number(process.env.E2E_REDIS_PORT ?? 6379);
  const password = process.env.E2E_REDIS_PASSWORD ?? process.env.REDIS_PASSWORD;
  const client = new Redis({
    host,
    port,
    password,
    enableOfflineQueue: false,
    autoResubscribe: false,
    autoResendUnfulfilledCommands: false,
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  await client.connect();
  return client;
};

const registerUser = async (email: string, password: string): Promise<any> => {
  const res = await registerUserWithTokens(email, password);
  return res.user;
};

describe('User registration (e2e, real services)', () => {
  jest.setTimeout(60000);

  it('POST /api/v1/user/registration returns user + tokens and sets refresh cookie', async () => {
    const rawEmail = makeEmail();
    const dto = {
      email: rawEmail,
      name: 'User',
      password: 'secret12',
    };

    const res = await request(baseUrl)
      .post(registrationPath)
      .set('x-request-id', randomUUID())
      .send(dto)
      .expect(201);

    expect(res.body).toEqual({
      user: expect.objectContaining({
        email: rawEmail.toLowerCase(),
        name: 'User',
        sub: expect.any(Number),
      }),
      tokens: expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        accessJti: expect.any(String),
        refreshJti: expect.any(String),
        accessTtlSec: expect.any(Number),
        refreshTtlSec: expect.any(Number),
      }),
    });

    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refreshToken=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/');
  });

  it('rejects duplicate registration for the same email', async () => {
    const rawEmail = makeEmail();
    const payload = { email: rawEmail, name: 'User', password: 'secret12' };

    await registerUser(rawEmail, payload.password);

    const res = await request(baseUrl)
      .post(registrationPath)
      .set('x-request-id', randomUUID())
      .send(payload)
      .expect(400);

    expect(typeof res.body.message).toBe('string');
  });
});

describe('User login (e2e, real services)', () => {
  jest.setTimeout(60000);

  it('POST /api/v1/user/login returns user + tokens and sets refresh cookie', async () => {
    const rawEmail = makeEmail();
    const password = 'secret12';
    await registerUser(rawEmail, password);

    const res = await request(baseUrl)
      .post(loginPath)
      .set('x-request-id', randomUUID())
      .send({ email: rawEmail, password })
      .expect(201);

    expect(res.body).toEqual({
      user: expect.objectContaining({
        email: rawEmail.toLowerCase(),
        name: 'User',
        sub: expect.any(Number),
      }),
      tokens: expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        accessJti: expect.any(String),
        refreshJti: expect.any(String),
        accessTtlSec: expect.any(Number),
        refreshTtlSec: expect.any(Number),
      }),
    });

    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refreshToken=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/');
  });

  it('rejects login with invalid password', async () => {
    const rawEmail = makeEmail();
    const password = 'secret12';
    await registerUser(rawEmail, password);

    const res = await request(baseUrl)
      .post(loginPath)
      .set('x-request-id', randomUUID())
      .send({ email: rawEmail, password: 'secret13' })
      .expect(401);

    expect(typeof res.body.message).toBe('string');
  });
});

describe('Contribution (e2e, real services)', () => {
  jest.setTimeout(60000);

  it('creates, lists, filters, updates, and removes a contribution', async () => {
    const rawEmail = makeEmail();
    const password = 'secret12';
    const { user, tokens } = await registerUserWithTokens(rawEmail, password);
    const accessToken = tokens.accessToken as string;

    const payload = {
      title: 'First article',
      description: 'Hello from e2e',
      publishedAt: new Date().toISOString(),
    };

    const createdRes = await request(baseUrl)
      .post(contributionPath)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const created = createdRes.body;
    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: payload.title,
        description: payload.description,
        authorId: user.sub,
        authorName: expect.any(String),
        publishedAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    const listRes = await request(baseUrl)
      .get(contributionPath)
      .set('x-request-id', randomUUID())
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(listRes.body).toEqual({
      items: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 10,
    });
    expect(listRes.body.items.some((item: any) => item.id === created.id)).toBe(
      true,
    );

    const filterRes = await request(baseUrl)
      .get(contributionPath)
      .set('x-request-id', randomUUID())
      .query({ authorId: user.sub })
      .expect(200);

    expect(filterRes.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, authorId: user.sub }),
      ]),
    );

    const getRes = await request(baseUrl)
      .get(`${contributionPath}/${created.id}`)
      .set('x-request-id', randomUUID())
      .expect(200);

    expect(getRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        title: payload.title,
      }),
    );

    const updatedRes = await request(baseUrl)
      .patch(`${contributionPath}/${created.id}`)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated title' })
      .expect(200);

    expect(updatedRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        title: 'Updated title',
      }),
    );

    const deleteRes = await request(baseUrl)
      .delete(`${contributionPath}/${created.id}`)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(deleteRes.body).toEqual({ id: created.id });
  });

  it('rejects creating a contribution without auth', async () => {
    const payload = {
      title: 'Unauthorized article',
      description: 'Should be rejected',
      publishedAt: new Date().toISOString(),
    };

    const res = await request(baseUrl)
      .post(contributionPath)
      .set('x-request-id', randomUUID())
      .send(payload)
      .expect(401);

    expect(typeof res.body.message).toBe('string');
  });

  it('creates multiple contributions for the same user', async () => {
    const rawEmail = makeEmail();
    const password = 'secret12';
    const { tokens } = await registerUserWithTokens(rawEmail, password);
    const accessToken = tokens.accessToken as string;

    const payload1 = {
      title: 'First article',
      description: 'First',
      publishedAt: new Date().toISOString(),
    };
    const payload2 = {
      title: 'Second article',
      description: 'Second',
      publishedAt: new Date().toISOString(),
    };

    const res1 = await request(baseUrl)
      .post(contributionPath)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload1)
      .expect(201);

    const res2 = await request(baseUrl)
      .post(contributionPath)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload2)
      .expect(201);

    expect(res1.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: payload1.title,
      }),
    );
    expect(res2.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: payload2.title,
      }),
    );
  });
});

describe('Contribution cache (e2e, redis)', () => {
  jest.setTimeout(60000);
  let redis: Redis | null = null;
  let redisReady = false;

  beforeAll(async () => {
    try {
      redis = await connectRedis();
      await redis.ping();
      redisReady = true;
    } catch {
      redisReady = false;
    }
  });

  afterAll(async () => {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        // ignore
      } finally {
        redis.disconnect();
      }
    }
  });

  it('caches list and detail and invalidates list on update', async () => {
    if (!redisReady || !redis) {
      return;
    }
    const rawEmail = makeEmail();
    const password = 'secret12';
    const { user, tokens } = await registerUserWithTokens(rawEmail, password);
    const accessToken = tokens.accessToken as string;

    const payload = {
      title: 'Cache article',
      description: 'Cache body',
      publishedAt: new Date().toISOString(),
    };

    const createdRes = await request(baseUrl)
      .post(contributionPath)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const created = createdRes.body;
    const detailKey = `${REDIS_PREFIX}contrib:id:${created.id}`;
    const cachedDetailRaw = await redis.get(detailKey);
    expect(cachedDetailRaw).toBeTruthy();
    expect(JSON.parse(cachedDetailRaw as string).id).toBe(created.id);

    const listQuery = { page: 1, limit: 5, authorId: user.sub };
    await request(baseUrl)
      .get(contributionPath)
      .set('x-request-id', randomUUID())
      .query(listQuery)
      .expect(200);

    const versionBefore = await redis.get(REDIS_VERSION_KEY);
    expect(versionBefore).toBeTruthy();
    const listKeyBefore = buildListCacheKey(versionBefore as string, listQuery);
    const cachedListRaw = await redis.get(listKeyBefore);
    expect(cachedListRaw).toBeTruthy();

    const updatedRes = await request(baseUrl)
      .patch(`${contributionPath}/${created.id}`)
      .set('x-request-id', randomUUID())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Cache updated' })
      .expect(200);

    const cachedAfterRaw = await redis.get(detailKey);
    expect(cachedAfterRaw).toBeTruthy();
    expect(JSON.parse(cachedAfterRaw as string).title).toBe(
      updatedRes.body.title,
    );

    const versionAfter = await redis.get(REDIS_VERSION_KEY);
    expect(versionAfter).toBeTruthy();
    expect(versionAfter).not.toBe(versionBefore);

    await request(baseUrl)
      .get(contributionPath)
      .set('x-request-id', randomUUID())
      .query(listQuery)
      .expect(200);

    const listKeyAfter = buildListCacheKey(versionAfter as string, listQuery);
    const cachedListAfterRaw = await redis.get(listKeyAfter);
    expect(cachedListAfterRaw).toBeTruthy();
  });
});
