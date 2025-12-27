import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
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

    if (error instanceof AppError) {
      return c.json(
        {
          message: error.message,
          code: error.code,
        },
        error.statusCode
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
