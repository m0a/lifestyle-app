import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDb, type Database } from './db';
import { errorHandler } from './middleware/error';
import { auth } from './routes/auth';
import { weights } from './routes/weights';
import { meals } from './routes/meals';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

type Variables = {
  db: Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', errorHandler);
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

// Routes
app.route('/api/auth', auth);
app.route('/api/weights', weights);
app.route('/api/meals', meals);

export default app;
