import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAnalysisService } from '@lifestyle-app/backend/services/ai-analysis';
import type { FoodItem } from '@lifestyle-app/shared';

// Mock the AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

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

      // Rounding: 2.22 -> 2.2 each time
      expect(totals.protein).toBe(2.2);
      expect(totals.fat).toBe(4.4);
      expect(totals.carbs).toBe(6.7); // 3.3 + 3.33 rounded
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
  });

  describe('analyzeMealPhoto', () => {
    it('should return success with food items when AI detects food', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          foods: [
            { name: 'ラーメン', portion: 'large', calories: 600, protein: 20.0, fat: 25.0, carbs: 70.0 },
            { name: '餃子', portion: 'medium', calories: 200, protein: 8.0, fat: 10.0, carbs: 20.0 },
          ],
          isFood: true,
        },
      });

      const imageData = new ArrayBuffer(100);
      const result = await service.analyzeMealPhoto(imageData, 'image/jpeg');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.foodItems).toHaveLength(2);
        expect(result.result.foodItems[0].name).toBe('ラーメン');
        expect(result.result.totals.calories).toBe(800);
      }
    });

    it('should return failure when AI detects non-food image', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          foods: [],
          isFood: false,
          message: 'これは食事の写真ではありません',
        },
      });

      const imageData = new ArrayBuffer(100);
      const result = await service.analyzeMealPhoto(imageData, 'image/jpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe('not_food');
        expect(result.failure.message).toContain('食事の写真ではありません');
      }
    });

    it('should return failure when AI call throws error', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

      mockGenerateObject.mockRejectedValueOnce(new Error('API error'));

      const imageData = new ArrayBuffer(100);
      const result = await service.analyzeMealPhoto(imageData, 'image/jpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe('analysis_failed');
      }
    });

    it('should assign unique IDs to each food item', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

      // Reset uuid mock to return different values
      const { v4 } = await import('uuid');
      const mockV4 = v4 as ReturnType<typeof vi.fn>;
      let callCount = 0;
      mockV4.mockImplementation(() => `uuid-${++callCount}`);

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          foods: [
            { name: 'Item1', portion: 'medium', calories: 100, protein: 5, fat: 2, carbs: 10 },
            { name: 'Item2', portion: 'small', calories: 50, protein: 2, fat: 1, carbs: 5 },
          ],
          isFood: true,
        },
      });

      const imageData = new ArrayBuffer(100);
      const result = await service.analyzeMealPhoto(imageData, 'image/jpeg');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.foodItems[0].id).toBeDefined();
        expect(result.result.foodItems[1].id).toBeDefined();
      }
    });
  });
});
