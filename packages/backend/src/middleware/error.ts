import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export class AppError extends Error {
  readonly isAppError = true;

  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface AppErrorLike {
  message: string;
  statusCode: number;
  code?: string;
  name: string;
}

function isAppError(error: unknown): error is AppErrorLike {
  if (error === null || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  return (
    e['name'] === 'AppError' &&
    typeof e['statusCode'] === 'number' &&
    typeof e['message'] === 'string'
  );
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof HTTPException) {
      return c.json(
        {
          message: error.message,
          code: 'HTTP_ERROR',
        },
        error.status
      );
    }

    if (error instanceof ZodError) {
      return c.json(
        {
          message: 'バリデーションエラー',
          code: 'VALIDATION_ERROR',
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    if (isAppError(error)) {
      const statusCode = error.statusCode as 400 | 401 | 403 | 404 | 500;
      return c.json(
        {
          message: error.message,
          code: error.code,
        },
        statusCode
      );
    }

    return c.json(
      {
        message: 'サーバーエラーが発生しました',
        code: 'INTERNAL_ERROR',
      },
      500
    );
  }
}
