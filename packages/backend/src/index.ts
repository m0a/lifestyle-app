import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { createDb, type Database } from './db';
import { auth } from './routes/auth';
import { weights } from './routes/weights';
import { meals } from './routes/meals';
import { exercises } from './routes/exercises';
import { dashboard } from './routes/dashboard';
import { user } from './routes/user';
import { logs } from './routes/logs';
import { mealAnalysis } from './routes/meal-analysis';
import { mealChat } from './routes/meal-chat';
import { emailVerify } from './routes/email/verify';
import { PhotoStorageService } from './services/photo-storage';
import { requestContext } from './middleware/requestContext';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  PHOTOS: R2Bucket;
  ASSETS: Fetcher;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
};

type Variables = {
  db: Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Global error handler
app.onError((err, c) => {
  // Extract request context for error tracing
  const requestContext = c.get('requestContext');
  const requestId = requestContext?.requestId;
  const userId = requestContext?.userId;

  // Enhanced error logging with Request ID and User ID
  const logPrefix = requestId ? `[${requestId}]` : '[NO_REQUEST_ID]';
  const userInfo = userId ? ` [User: ${userId}]` : ' [Unauthenticated]';
  console.error(`${logPrefix}${userInfo} Error:`, err);

  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, code: 'HTTP_ERROR', requestId },
      err.status
    );
  }

  if (err instanceof ZodError) {
    return c.json({
      message: 'バリデーションエラー',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      requestId,
    }, 400);
  }

  // Check for AppError by duck typing
  const e = err as unknown as Record<string, unknown>;
  if (e['name'] === 'AppError' && typeof e['statusCode'] === 'number') {
    const statusCode = e['statusCode'] as 400 | 401 | 403 | 404 | 500;
    return c.json(
      { message: err.message, code: e['code'] as string, requestId },
      statusCode
    );
  }

  return c.json(
    { message: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR', requestId },
    500
  );
});

// Middleware
app.use('*', logger());
app.use('*', requestContext()); // Request ID tracking - MUST be after logger
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Database middleware
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
  });
});

// Photo serving - no auth required (keys are unguessable UUIDs)
app.get('/api/meals/photos/*', async (c) => {
  const key = c.req.path.replace('/api/meals/photos/', '');
  const decodedKey = decodeURIComponent(key);
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);

  const result = await photoStorage.getPhotoForServing(decodedKey);
  if (!result) {
    return c.json({ error: 'not_found', message: '写真が見つかりません' }, 404);
  }

  return new Response(result.body, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// Routes - chain format for RPC type inference
const routes = app
  .route('/api/auth', auth)
  .route('/api/weights', weights)
  .route('/api/meals', meals)
  .route('/api/meals', mealAnalysis)
  .route('/api/meals', mealChat)
  .route('/api/exercises', exercises)
  .route('/api/dashboard', dashboard)
  .route('/api/user', user)
  .route('/api/logs', logs)
  .route('/api/email', emailVerify);

// SPA fallback - serve index.html for non-API routes
app.get('*', async (c) => {
  // Let ASSETS handle static files and SPA routing
  return c.env.ASSETS.fetch(c.req.raw);
});

// Export type for RPC client
export type AppType = typeof routes;

export default app;
