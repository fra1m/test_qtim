import * as request from 'supertest';
import { randomUUID } from 'node:crypto';

const normalizeBaseUrl = (raw: string): string => raw.replace(/\/+$/, '');

const normalizePrefix = (raw: string): string => {
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return `/${trimmed}`;
};

const baseUrl = normalizeBaseUrl(
  process.env.E2E_BASE_URL ?? 'http://localhost:3000',
);
const apiPrefix = normalizePrefix(process.env.E2E_API_PREFIX ?? 'api/v1');
const registrationPath = `${apiPrefix}/user/registration`;
const loginPath = `${apiPrefix}/user/login`;

const makeEmail = (): string => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `User+${Date.now()}-${rand}@Example.com`;
};

const registerUser = async (email: string, password: string): Promise<any> => {
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

  return res.body.user;
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
