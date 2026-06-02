/**
 * Datetime storage-type convention (#105).
 *
 * Timestamps are stored in one of two forms; new tables MUST pick one, and
 * cross-table code must never compare the two forms directly (use the matching
 * helper in lib/dateCutoff.ts — epochCutoff / isoCutoff):
 *
 *  - TEXT ISO8601 — this file's tables (users, weight_records, meal_records,
 *    exercise_records, ai_usage_records) and webauthn (schema/webauthn.ts).
 *    recorded_at carries a local "+09:00" offset; created_at / updated_at are UTC "Z".
 *  - INTEGER epoch ms — the token / email family (schema/email.ts:
 *    password_reset_tokens, email_verification_tokens, email_change_requests,
 *    email_delivery_logs, email_rate_limits).
 *
 * Primary-key-type convention (#106).
 *
 * Two PK styles coexist by role; this is intentional, not drift:
 *  - TEXT (uuid / nanoid) — domain rows whose id is exposed to clients in URLs
 *    and the RPC API (users, weight_records, meal_records, meal_photos,
 *    meal_food_items, exercise_records, ai_usage_records, …). Opaque,
 *    unguessable, and stable across environments.
 *  - INTEGER AUTOINCREMENT — internal-only log/token rows never surfaced by id
 *    (schema/email.ts: password_reset_tokens, email_verification_tokens,
 *    email_change_requests, email_delivery_logs). The token itself (a separate
 *    unique column), not the numeric id, is the externally-meaningful handle.
 */
import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    emailVerified: integer('email_verified').notNull().default(0), // 0 = false, 1 = true
    goalWeight: real('goal_weight'),
    goalCalories: integer('goal_calories').default(2000),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    // The cleanup cron filters `email_verified = 0 AND created_at < cutoff`.
    // A lone email_verified index is near-useless (2 distinct values); the
    // composite lets that scan seek straight to old unverified rows (#106,
    // replaces idx_users_email_verified in migration 0038).
    idx_users_email_verified_created: index('idx_users_email_verified_created').on(
      table.emailVerified,
      table.createdAt
    ),
  })
);

export const weightRecords = sqliteTable(
  'weight_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weight: real('weight').notNull(),
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    idx_weight_user_date: index('idx_weight_user_date').on(table.userId, table.recordedAt),
  })
);

export const mealRecords = sqliteTable(
  'meal_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
    content: text('content').notNull(),
    calories: integer('calories'),
    // AI analysis fields
    totalProtein: real('total_protein'),
    totalFat: real('total_fat'),
    totalCarbs: real('total_carbs'),
    analysisSource: text('analysis_source'), // 'ai' | 'manual'
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    idx_meal_user_date: index('idx_meal_user_date').on(table.userId, table.recordedAt),
  })
);

export const mealPhotos = sqliteTable(
  'meal_photos',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => mealRecords.id, { onDelete: 'cascade' }),
    photoKey: text('photo_key').notNull(),
    displayOrder: integer('display_order').notNull(),
    analysisStatus: text('analysis_status'), // 'pending' | 'analyzing' | 'complete' | 'failed'
    calories: integer('calories'),
    protein: real('protein'),
    fat: real('fat'),
    carbs: real('carbs'),
    createdAt: text('created_at').notNull(),
    // Photos are UPDATEd in place (analysis result / status), so track the last
    // change time. $onUpdate auto-bumps it on every Drizzle .update(); $defaultFn
    // seeds it on insert — no call site needs to set it manually (#106).
    // NOTE: migration 0037 gives the DB column a sentinel DEFAULT '1970-...' that
    // is intentionally NOT modeled here (SQLite needs a constant default to ADD a
    // NOT NULL column); the app always writes a real value, so the default never
    // fires for new rows.
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    idx_meal_photos_meal: index('idx_meal_photos_meal').on(table.mealId, table.displayOrder),
    // Photo serving verifies ownership by looking up photo_key on every image
    // request (#97); index it so that lookup stays O(log n).
    idx_meal_photos_photo_key: index('idx_meal_photos_photo_key').on(table.photoKey),
  })
);

export const mealFoodItems = sqliteTable(
  'meal_food_items',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => mealRecords.id, { onDelete: 'cascade' }),
    photoId: text('photo_id').references(() => mealPhotos.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    portion: text('portion').notNull(), // 'small' | 'medium' | 'large'
    calories: integer('calories').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    createdAt: text('created_at').notNull(),
    // Food items are UPDATEd in place (chat / manual edits), so track the last
    // change time. $onUpdate auto-bumps on every Drizzle .update(); $defaultFn
    // seeds it on insert (#106). As with meal_photos above, migration 0037's
    // sentinel DB DEFAULT is intentionally not modeled here.
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    idx_food_items_meal: index('idx_food_items_meal').on(table.mealId),
    idx_meal_food_items_photo: index('idx_meal_food_items_photo').on(table.photoId),
  })
);

export const mealChatMessages = sqliteTable(
  'meal_chat_messages',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => mealRecords.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    appliedChanges: text('applied_changes'), // JSON string
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    idx_chat_messages_meal: index('idx_chat_messages_meal').on(table.mealId, table.createdAt),
  })
);

export const exerciseRecords = sqliteTable(
  'exercise_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    muscleGroup: text('muscle_group'), // 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'other'
    setNumber: integer('set_number').notNull().default(1), // セット番号（1, 2, 3...）
    reps: integer('reps').notNull(),
    weight: real('weight'),
    variation: text('variation'), // バリエーション（ワイド、ナロウ等）
    memo: text('memo'),
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    idx_exercise_user_date: index('idx_exercise_user_date').on(table.userId, table.recordedAt),
    idx_exercise_user_type_date: index('idx_exercise_user_type_date').on(table.userId, table.exerciseType, table.recordedAt),
  })
);

// Append-only AI usage detail. Pruned by the retention cron (#104, ~90 days)
// using idx_ai_usage_user_date; the daily limit/usage views only read the
// current day, and the lifetime "total tokens" display reads ai_usage_totals,
// so old detail rows are safe to delete. created_at is TEXT ISO8601.
export const aiUsageRecords = sqliteTable(
  'ai_usage_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    featureType: text('feature_type').notNull(), // 'image_analysis' | 'text_analysis' | 'chat'
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    idx_ai_usage_user_date: index('idx_ai_usage_user_date').on(table.userId, table.createdAt),
  })
);

// Per-user lifetime AI token rollup. Maintained incrementally on every
// recordUsage so the settings "total tokens" display stays accurate even after
// old ai_usage_records detail rows are pruned by the retention cron (#104).
export const aiUsageTotals = sqliteTable('ai_usage_totals', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalTokens: integer('total_tokens').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

// Aliases for convenience
export { weightRecords as weights };
export { mealRecords as meals };
export { exerciseRecords as exercises };

// Type exports for use in services
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WeightRecord = typeof weightRecords.$inferSelect;
export type NewWeightRecord = typeof weightRecords.$inferInsert;
export type MealRecord = typeof mealRecords.$inferSelect;
export type NewMealRecord = typeof mealRecords.$inferInsert;
export type MealPhoto = typeof mealPhotos.$inferSelect;
export type NewMealPhoto = typeof mealPhotos.$inferInsert;
export type ExerciseRecord = typeof exerciseRecords.$inferSelect;
export type NewExerciseRecord = typeof exerciseRecords.$inferInsert;
export type MealFoodItem = typeof mealFoodItems.$inferSelect;
export type NewMealFoodItem = typeof mealFoodItems.$inferInsert;
export type MealChatMessage = typeof mealChatMessages.$inferSelect;
export type NewMealChatMessage = typeof mealChatMessages.$inferInsert;
export type AIUsageRecord = typeof aiUsageRecords.$inferSelect;
export type NewAIUsageRecord = typeof aiUsageRecords.$inferInsert;
export type AIUsageTotal = typeof aiUsageTotals.$inferSelect;
export type NewAIUsageTotal = typeof aiUsageTotals.$inferInsert;

// Email-related tables
export * from './schema/email';

// WebAuthn / Passkey tables
export * from './schema/webauthn';
