import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type CookieValue = string; // при желании расширь до string | number | boolean
type CookieMap = Record<string, CookieValue>;

export const Cookies = createParamDecorator(
  (
    name: string | undefined,
    ctx: ExecutionContext,
  ): Partial<CookieMap> | CookieValue | undefined => {
    // request.cookies приходит из cookie-parser и по умолчанию типизирован как any.
    // Дадим ему безопасный тип.
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { cookies?: Partial<CookieMap> }>();

    const all: Partial<CookieMap> = req.cookies ?? {};
    return name ? all[name] : all;
  },
);