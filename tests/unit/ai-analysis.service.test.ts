import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FoodItem } from '../../packages/shared/src';

// Mock the AI provider module to prevent import errors
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

vi.mock('../../packages/backend/src/lib/ai-provider', () => ({
  getAIProvider: () => vi.fn(() => 'mock-model'),
  getModelId: () => 'mock-model-id',
}));

// Import service after mocks
import { AIAnalysisService } from '../../packages/backend/src/services/ai-analysis';

describe('AIAnalysisService', () => {
  let service: AIAnalysisService;
  const mockConfig = {
    provider: 'google' as const,
    apiKey: 'test-api-key',
    model: 'gemini-3-flash',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIAnalysisService(mockConfig);
  });

  describe('calculateTotals', () => {
    it('should calculate nutrition totals correctly', () => {
      const foodItems: FoodItem[] = [
        { id: '1', name: 'ご飯', portion: 'medium', calories: 250, protein: 4.5, fat: 0.5, carbs: 55.0 },
        { id: '2', name: '味噌汁', portion: 'medium', calories: 40, protein: 3.0, fat: 1.0, carbs: 4.0 },
        { id: '3', name: '焼き鮭', portion: 'medium', calories: 180, protein: 22.0, fat: 9.0, carbs: 0.5 },
      ];

      const totals = service.calculateTotals(foodItems);

      expect(totals.calories).toBe(470);
      expect(totals.protein).toBe(29.5);
      expect(totals.fat).toBe(10.5);
      expect(totals.carbs).toBe(59.5);
    });

    it('should return zeros for empty food items', () => {
      const totals = service.calculateTotals([]);

      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.carbs).toBe(0);
    });

    it('should round decimal values to 1 decimal place', () => {
      const foodItems: FoodItem[] = [
        { id: '1', name: 'Item1', portion: 'medium', calories: 100, protein: 1.11, fat: 2.22, carbs: 3.33 },
        { id: '2', name: 'Item2', portion: 'medium', calories: 100, protein: 1.11, fat: 2.22, carbs: 3.33 },
      ];

      const totals = service.calculateTotals(foodItems);

      // Rounding happens at each step: 1.1 + 1.11 = 2.21 -> 2.2
      expect(totals.protein).toBe(2.2);
      expect(totals.fat).toBe(4.4);
      expect(totals.carbs).toBe(6.6); // 3.3 + 3.33 = 6.63, rounds to 6.6
    });

    it('should handle single food item', () => {
      const foodItems: FoodItem[] = [
        { id: '1', name: 'おにぎり', portion: 'medium', calories: 200, protein: 4.0, fat: 1.0, carbs: 42.0 },
      ];

      const totals = service.calculateTotals(foodItems);

      expect(totals.calories).toBe(200);
      expect(totals.protein).toBe(4.0);
      expect(totals.fat).toBe(1.0);
      expect(totals.carbs).toBe(42.0);
    });

    it('should handle large number of food items', () => {
      const foodItems: FoodItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Food ${i}`,
        portion: 'medium' as const,
        calories: 100,
        protein: 10.0,
        fat: 5.0,
        carbs: 20.0,
      }));

      const totals = service.calculateTotals(foodItems);

      expect(totals.calories).toBe(1000);
      expect(totals.protein).toBe(100.0);
      expect(totals.fat).toBe(50.0);
      expect(totals.carbs).toBe(200.0);
    });

    it('should handle food items with zero values', () => {
      const foodItems: FoodItem[] = [
        { id: '1', name: 'お茶', portion: 'medium', calories: 0, protein: 0, fat: 0, carbs: 0 },
        { id: '2', name: '水', portion: 'large', calories: 0, protein: 0, fat: 0, carbs: 0 },
      ];

      const totals = service.calculateTotals(foodItems);

      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.carbs).toBe(0);
    });
  });

  // Note: analyzeMealPhoto() tests require complex mocking of the AI SDK.
  // The AI SDK's ESM structure makes it difficult to mock with vitest.
  // These tests are better suited for integration tests with actual API mocking
  // or E2E tests with a test environment.
  //
  // The analyzeMealPhoto method handles:
  // - Converting ArrayBuffer to base64
  // - Calling AI SDK with meal analysis prompt
  // - Parsing AI response with Zod validation
  // - Generating UUIDs for each food item
  // - Calculating totals (tested above)
  // - Handling non-food detection
  // - Error handling for API failures
});
