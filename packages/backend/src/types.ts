import type { Database } from './db';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

export type Variables = {
  db: Database;
  user: { id: string; email: string };
};
