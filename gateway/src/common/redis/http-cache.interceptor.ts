// TODO: разобраться как правильно кешировать - сейчас кешируем только безопасные публичные GET

import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

function sortedQueryString(query: Record<string, any> = {}) {
  const keys = Object.keys(query).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(String(query[k]))}`)
    .join('&');
}

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  // кэшируем только публичные GET И только роуты /users/**
  protected override isRequestCacheable(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (!req || req.method !== 'GET') return false;

    // фильтруем по пути: /api/v1/users/... или /users/...
    const urlPath = String((req.originalUrl ?? req.url).split('?')[0]);
    const isUsersRoute = /^\/(?:api\/v\d+\/)?users\//i.test(urlPath);
    if (!isUsersRoute) return false;

    // не кешируем динамические/админские выборки
    if (/^\/(?:api\/v\d+\/)?users\/all/i.test(urlPath)) return false;

    // приватное не кэшируем
    const hasAuth =
      !!req.headers?.authorization ||
      !!req.user ||
      (typeof req.headers?.cookie === 'string' &&
        req.headers.cookie.length > 0);
    if (hasAuth) return false;

    return true;
  }

  // ключ только для публичных users-GET
  protected override trackBy(ctx: ExecutionContext): string | undefined {
    const req = ctx.switchToHttp().getRequest();
    if (!req || req.method !== 'GET') return undefined;

    const urlPath = String((req.originalUrl ?? req.url).split('?')[0]);
    const isUsersRoute = /^\/(?:api\/v\d+\/)?users\//i.test(urlPath);
    if (!isUsersRoute) return undefined;
    if (/^\/(?:api\/v\d+\/)?users\/all/i.test(urlPath)) return undefined;

    const qs = sortedQueryString(req.query ?? {});
    return `pub|${urlPath}?${qs}`;
  }
}
