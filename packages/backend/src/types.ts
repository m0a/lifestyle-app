import type { Database } from './db';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  // AI meal analysis
  PHOTOS: R2Bucket;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
};

export type Variables = {
  db: Database;
  user: { id: string; email: string };
  userId: string;
};
