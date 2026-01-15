import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AUTH_ACCESS_PRIVATE_KEY,
  AUTH_ACCESS_PUBLIC_KEY,
  AUTH_REFRESH_PRIVATE_KEY,
  AUTH_REFRESH_PUBLIC_KEY,
  AUTH_TOKEN_PEPPER,
} from 'src/common/constants/auth.constants';
import { AuthKeysModule } from './auth.keys.module';

describe('AuthKeysModule', () => {
  const buildModule = async (values: Record<string, string | undefined>) => {
    const cfg = {
      get: jest.fn((key: string) => values[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthKeysModule],
    })
      .overrideProvider(ConfigService)
      .useValue(cfg)
      .compile();

    return module;
  };

  it('provides keys and pepper from inline config values', async () => {
    const module = await buildModule({
      JWT_PRIVATE_KEY: 'access\\nkey',
      JWT_PUBLIC_KEY: 'access-public',
      JWT_REFRESH_PRIVATE_KEY: 'refresh\\nkey',
      JWT_REFRESH_PUBLIC_KEY: 'refresh-public',
      TOKEN_PEPPER: 'pepper-value',
    });

    expect(module.get(AUTH_ACCESS_PRIVATE_KEY)).toBe('access\nkey');
    expect(module.get(AUTH_ACCESS_PUBLIC_KEY)).toBe('access-public');
    expect(module.get(AUTH_REFRESH_PRIVATE_KEY)).toBe('refresh\nkey');
    expect(module.get(AUTH_REFRESH_PUBLIC_KEY)).toBe('refresh-public');
    expect(module.get(AUTH_TOKEN_PEPPER)).toBe('pepper-value');
  });

  it('uses base64 values when provided', async () => {
    const module = await buildModule({
      JWT_PRIVATE_KEY_B64: Buffer.from('access-b64').toString('base64'),
      JWT_PUBLIC_KEY_B64: Buffer.from('access-public-b64').toString('base64'),
      JWT_REFRESH_PRIVATE_KEY_B64:
        Buffer.from('refresh-b64').toString('base64'),
      JWT_REFRESH_PUBLIC_KEY_B64:
        Buffer.from('refresh-public-b64').toString('base64'),
      TOKEN_PEPPER: 'pepper-value',
    });

    expect(module.get(AUTH_ACCESS_PRIVATE_KEY)).toBe('access-b64');
    expect(module.get(AUTH_ACCESS_PUBLIC_KEY)).toBe('access-public-b64');
    expect(module.get(AUTH_REFRESH_PRIVATE_KEY)).toBe('refresh-b64');
    expect(module.get(AUTH_REFRESH_PUBLIC_KEY)).toBe('refresh-public-b64');
  });

  it('throws when TOKEN_PEPPER is missing', async () => {
    await expect(
      buildModule({
        JWT_PRIVATE_KEY: 'access',
        JWT_PUBLIC_KEY: 'access-public',
        JWT_REFRESH_PRIVATE_KEY: 'refresh',
        JWT_REFRESH_PUBLIC_KEY: 'refresh-public',
      }),
    ).rejects.toThrow('Missing TOKEN_PEPPER');
  });
});
