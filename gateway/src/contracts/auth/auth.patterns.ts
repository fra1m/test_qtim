export const AUTH_PATTERNS = {
  /** 'auth.hashPassword' */
  AUTH_HASH: 'auth.hashPassword',
  /** 'auth.createCredentials' */
  AUTH_CREDENTIALS: 'auth.createCredentials',
  /** 'auth.generateTokens' */
  AUTH_GENERATE_TOKENS: 'auth.generateTokens',
  /** */
  AUTH_LOGIN_BY_PASSWORD: 'auth.authByPassword',
  /** 'auth.validateAccess' */
  AUTH_ACCESS_VALIDATE: 'auth.validateAccess',
  /** 'auth.validateRefresh'*/
  AUTH_REFRESH_VALIDATE: 'auth.validateRefresh',
  /** 'auth.removeToken' */
  AUTH_REMOVE_TOKEN: 'auth.removeToken',
} as const;

export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
