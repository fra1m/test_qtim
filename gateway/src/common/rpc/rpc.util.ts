// common/rpc.ts
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout as rxTimeout, retry, timer } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

type RpcOptions = {
  timeoutMs?: number;
  /** кол-во ПОВТОРОВ после первой попытки */
  retries?: number;
  backoffMs?: number;
  jitterMs?: number;
};

/** Безопасная строковизация для логов/сообщений */
function safeStringify(val: unknown, fallback = 'Bad Request'): string {
  if (typeof val === 'string') return val;
  if (val instanceof Error) return val.message;
  try {
    return (
      JSON.stringify(val, (_k: string, v: unknown): unknown => {
        if (typeof v === 'bigint') {
          return v.toString();
        }
        return v;
      }) ?? fallback
    );
  } catch {
    return fallback;
  }
}

function extractMessageStatus(err: unknown): {
  message: string;
  status: number;
} {
  // классический Error
  if (err instanceof Error) {
    const status =
      typeof (err as any).status === 'number'
        ? Number((err as any).status)
        : typeof (err as any).statusCode === 'number'
          ? Number((err as any).statusCode)
          : HttpStatus.BAD_REQUEST;
    return { message: err.message || 'Bad Request', status };
  }

  // объекты от RpcException / кастомные
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    const message =
      typeof e.message === 'string'
        ? e.message
        : typeof e.error === 'string'
          ? e.error
          : safeStringify(e);
    const status =
      typeof e.status === 'number'
        ? Number(e.status)
        : typeof e.statusCode === 'number'
          ? Number(e.statusCode)
          : HttpStatus.BAD_REQUEST;
    return { message, status };
  }

  // строки/прочее
  return { message: safeStringify(err), status: HttpStatus.BAD_REQUEST };
}

/** Что считаем транзитной (перемежающейся) ошибкой, которую можно повторить */
function isTransient(err: unknown): boolean {
  // RxJS timeout → transient
  if ((err as any)?.name === 'TimeoutError') return true;

  const code = (err as any)?.code as string | undefined;
  if (
    code &&
    [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENOTFOUND',
    ].includes(code)
  ) {
    return true;
  }

  const msg = (err as any)?.message as string | undefined;
  if (msg && /Channel closed|Unexpected close|Socket closed/i.test(msg)) {
    return true;
  }

  const { status } = extractMessageStatus(err);
  return status >= 500 && status < 600; // 5xx — можно ретраить
}

function backoffDelay(attempt: number, base: number, jitter: number): number {
  const exp = base * Math.pow(2, attempt); // 0,1,2 → base, 2*base, 4*base...
  const j = Math.floor(Math.random() * jitter);
  return exp + j;
}

export async function rpc<T>(
  client: ClientProxy,
  pattern: string,
  payload: unknown,
  opts: RpcOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retries = opts.retries ?? 1; // повторы ПОСЛЕ первой попытки
  const backoffMs = opts.backoffMs ?? 200;
  const jitterMs = opts.jitterMs ?? 200;

  const stream$ = client.send<T>(pattern, payload).pipe(
    rxTimeout(timeoutMs),
    retry({
      count: retries,
      // retryCount — 1..count (1 — первый повтор)
      delay: (error, retryCount) => {
        if (!isTransient(error)) {
          // клиентские/неповторяемые — сразу пробрасываем
          throw error;
        }
        const attemptIndex = retryCount - 1;
        return timer(backoffDelay(attemptIndex, backoffMs, jitterMs));
      },
      resetOnSuccess: true,
    }),
  );

  try {
    return await firstValueFrom(stream$);
  } catch (err) {
    const { message, status } = extractMessageStatus(err);
    throw new HttpException(message, status);
  }
}
