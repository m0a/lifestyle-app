import type { Context } from 'hono';
import { AIUsageService } from '../services/ai-usage';
import type { Database } from '../db';

/**
 * Check if the user has exceeded the daily AI usage limit.
 * Returns a 429 response if the limit is exceeded, null otherwise.
 *
 * Usage in route handlers:
 *   const limitCheck = await aiUsageLimitCheck(c);
 *   if (limitCheck) return limitCheck;
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aiUsageLimitCheck(c: Context<any>): Promise<Response | null> {
  const db = c.get('db') as Database;
  const user = c.get('user') as { id: string };

  const environment = (c.env?.ENVIRONMENT as string) ?? 'production';
  const aiUsageService = new AIUsageService(db, environment);
  const { allowed } = await aiUsageService.checkDailyLimit(user.id);

  if (!allowed) {
    return c.json(
      {
        error: 'ai_usage_limit_exceeded',
        message: '本日のAI使用上限に達しました。明日以降に再度お試しください。',
      },
      429
    );
  }

  return null;
}
