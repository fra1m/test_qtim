import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

type RpcErrorPayload = {
  message?: unknown; // может быть string | string[] | object
  status?: unknown; // может быть number | string
  [k: string]: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toMessage(v: unknown, fallback = 'Bad Request'): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  if (isObject(v) && typeof v.message === 'string') {
    return v.message;
  }
  return fallback;
}

function toStatus(v: unknown, fallback = HttpStatus.BAD_REQUEST): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

@Catch(RpcException)
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    const raw = exception.getError();
    let message = 'Bad Request';
    let status = HttpStatus.BAD_REQUEST;

    if (typeof raw === 'string') {
      message = raw;
    } else if (isObject(raw)) {
      const err = raw as RpcErrorPayload;
      message = toMessage(err.message, message);
      status = toStatus(err.status, status);
    }

    res.status(status).json({
      message,
      statusCode: status,
      error: (HttpStatus as any)[status] ?? 'Error', // enum reverse mapping
    });
  }
}
