import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ReqId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const rid: string = req.headers['x-request-id']?.toString() ?? req.id ?? '';
    return rid;
  },
);
