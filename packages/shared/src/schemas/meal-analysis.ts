import { z } from 'zod';

// Enums
export const portionSchema = z.enum(['small', 'medium', 'large']);
export type Portion = z.infer<typeof portionSchema>;

export const analysisSourceSchema = z.enum(['ai', 'manual']);
export type AnalysisSource = z.infer<typeof analysisSourceSchema>;

export const chatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const foodItemChangeActionSchema = z.enum(['add', 'remove', 'update']);
export type FoodItemChangeAction = z.infer<typeof foodItemChangeActionSchema>;

// Food item schema
export const foodItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  portion: portionSchema,
  calories: z.number().int().min(0).max(5000),
  protein: z.number().min(0).max(200),
  fat: z.number().min(0).max(200),
  carbs: z.number().min(0).max(500),
});
export type FoodItem = z.infer<typeof foodItemSchema>;

// Create food item (without id)
export const createFoodItemSchema = foodItemSchema.omit({ id: true });
export type CreateFoodItem = z.infer<typeof createFoodItemSchema>;

// Update food item (all optional)
export const updateFoodItemSchema = createFoodItemSchema.partial();
export type UpdateFoodItem = z.infer<typeof updateFoodItemSchema>;

// Nutrition totals
export const nutritionTotalsSchema = z.object({
  calories: z.number().int(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
});
export type NutritionTotals = z.infer<typeof nutritionTotalsSchema>;

// AI Analysis result
export const analysisResultSchema = z.object({
  mealId: z.string().uuid(),
  photoKey: z.string(),
  foodItems: z.array(foodItemSchema),
  totals: nutritionTotalsSchema,
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// AI Analysis failure
export const analysisFailureSchema = z.object({
  error: z.enum(['not_food', 'analysis_failed']),
  message: z.string(),
});
export type AnalysisFailure = z.infer<typeof analysisFailureSchema>;

// AI raw response (from LLM)
export const aiMealAnalysisResponseSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      portion: portionSchema,
      calories: z.number().int(),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
    })
  ),
  isFood: z.boolean(),
  message: z.string().optional(),
});
export type AIMealAnalysisResponse = z.infer<typeof aiMealAnalysisResponseSchema>;

// Food item change (from chat) - discriminated union based on action
export const foodItemChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    foodItem: createFoodItemSchema,
  }),
  z.object({
    action: z.literal('update'),
    foodItemId: z.string().uuid(),
    foodItem: updateFoodItemSchema, // Partial update
  }),
  z.object({
    action: z.literal('remove'),
    foodItemId: z.string().uuid(),
  }),
]);
export type FoodItemChange = z.infer<typeof foodItemChangeSchema>;

// Chat message
export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: chatRoleSchema,
  content: z.string().min(1).max(5000),
  appliedChanges: z.array(foodItemChangeSchema).optional(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Save meal request
export const saveMealAnalysisSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  recordedAt: z.string().datetime().optional(),
});
export type SaveMealAnalysis = z.infer<typeof saveMealAnalysisSchema>;

// Send chat message request
export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});
export type SendChatMessage = z.infer<typeof sendChatMessageSchema>;

// Apply chat suggestion request
export const applyChatSuggestionSchema = z.object({
  changes: z.array(foodItemChangeSchema),
});
export type ApplyChatSuggestion = z.infer<typeof applyChatSuggestionSchema>;

// Text analysis request (T001, T003)
export const textAnalysisRequestSchema = z.object({
  text: z.string().min(1, 'テキストを入力してください').max(500),
  currentTime: z.string().datetime().optional(),
});
export type TextAnalysisRequest = z.infer<typeof textAnalysisRequestSchema>;

// Meal type source for text analysis
export const mealTypeSourceSchema = z.enum(['text', 'time']);
export type MealTypeSource = z.infer<typeof mealTypeSourceSchema>;

// Date/time source for text analysis
export const dateTimeSourceSchema = z.enum(['text', 'now']);
export type DateTimeSource = z.infer<typeof dateTimeSourceSchema>;

// Text analysis response (T002)
export const textAnalysisResponseSchema = z.object({
  mealId: z.string().uuid(),
  foodItems: z.array(foodItemSchema),
  totals: nutritionTotalsSchema,
  inferredMealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  mealTypeSource: mealTypeSourceSchema,
  inferredRecordedAt: z.string().datetime(),
  dateTimeSource: dateTimeSourceSchema,
});
export type TextAnalysisResponse = z.infer<typeof textAnalysisResponseSchema>;

// Text analysis error
export const textAnalysisErrorSchema = z.object({
  error: z.enum(['analysis_failed', 'timeout', 'invalid_input']),
  message: z.string(),
});
export type TextAnalysisError = z.infer<typeof textAnalysisErrorSchema>;
