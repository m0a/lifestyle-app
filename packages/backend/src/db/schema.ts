import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  goalWeight: real('goal_weight'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
  (table) => [index('idx_weight_user_date').on(table.userId, table.recordedAt)]
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
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_meal_user_date').on(table.userId, table.recordedAt)]
);

export const exerciseRecords = sqliteTable(
  'exercise_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_exercise_user_date').on(table.userId, table.recordedAt)]
);

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
export type ExerciseRecord = typeof exerciseRecords.$inferSelect;
export type NewExerciseRecord = typeof exerciseRecords.$inferInsert;
