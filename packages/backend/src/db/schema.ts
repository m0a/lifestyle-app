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
    // AI analysis fields
    photoKey: text('photo_key'),
    totalProtein: real('total_protein'),
    totalFat: real('total_fat'),
    totalCarbs: real('total_carbs'),
    analysisSource: text('analysis_source'), // 'ai' | 'manual'
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_meal_user_date').on(table.userId, table.recordedAt)]
);

export const mealFoodItems = sqliteTable(
  'meal_food_items',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => mealRecords.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    portion: text('portion').notNull(), // 'small' | 'medium' | 'large'
    calories: integer('calories').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_food_items_meal').on(table.mealId)]
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
  (table) => [index('idx_chat_messages_meal').on(table.mealId, table.createdAt)]
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
export type MealFoodItem = typeof mealFoodItems.$inferSelect;
export type NewMealFoodItem = typeof mealFoodItems.$inferInsert;
export type MealChatMessage = typeof mealChatMessages.$inferSelect;
export type NewMealChatMessage = typeof mealChatMessages.$inferInsert;
