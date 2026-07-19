import type { MealType } from '../schemas';

/**
 * Map a local wall-clock hour (0-23) to a meal type.
 *
 * Single source of truth for the time→meal-type heuristic, shared by the
 * backend text-analysis path (`services/ai-analysis.ts`) and the frontend photo
 * flow (`PhotoAnalysisReview`). Keeping one copy stops the two flows from
 * drifting: before this, the text flow inferred the type from the (offset-aware)
 * time while the photo flow hard-coded 'lunch', so a dinner photo taken at 19:00
 * was saved as 昼食 (follow-up to #159).
 *
 * IMPORTANT: `hour` must already be the user's LOCAL hour. On the frontend that
 * is `new Date().getHours()`; on Cloudflare Workers (UTC) it must come from the
 * offset embedded in the ISO string (see `getLocalHour`), never `getHours()`.
 *
 *   6–9 → breakfast · 11–13 → lunch · 17–20 → dinner · otherwise → snack
 */
export function inferMealTypeFromHour(hour: number): MealType {
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}
