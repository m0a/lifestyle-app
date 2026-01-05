import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  goalWeight: real('goal_weight'),
  goalCalories: integer('goal_calories'),
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
    photoKey: text('photo_key'),
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
  (table) => ({
    idx_food_items_meal: index('idx_food_items_meal').on(table.mealId),
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
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    idx_exercise_user_date: index('idx_exercise_user_date').on(table.userId, table.recordedAt),
    idx_exercise_user_type_date: index('idx_exercise_user_type_date').on(table.userId, table.exerciseType, table.recordedAt),
  })
);

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
export type AIUsageRecord = typeof aiUsageRecords.$inferSelect;
export type NewAIUsageRecord = typeof aiUsageRecords.$inferInsert;
