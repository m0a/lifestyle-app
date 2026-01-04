import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../../packages/backend/src/services/dashboard';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      all: vi.fn(),
    };
    service = new DashboardService(mockDb);
  });

  describe('getSummary', () => {
    it('should return aggregated data for the specified period', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      // Mock weight data
      mockDb.all.mockResolvedValueOnce([
        { weight: 70.0, recordedAt: '2025-01-01' },
        { weight: 69.5, recordedAt: '2025-01-07' },
      ]);

      // Mock meal data
      mockDb.all.mockResolvedValueOnce([
        { calories: 2000 },
        { calories: 1800 },
        { calories: 2200 },
      ]);

      // Mock exercise data
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ベンチプレス', sets: 3, reps: 10 },
        { exerciseType: 'ベンチプレス', sets: 4, reps: 8 },
        { exerciseType: 'スクワット', sets: 3, reps: 12 },
      ]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result).toBeDefined();
      expect(result.weight).toBeDefined();
      expect(result.meals).toBeDefined();
      expect(result.exercises).toBeDefined();
    });

    it('should calculate weight change correctly', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockDb.all.mockResolvedValueOnce([
        { weight: 72.0, recordedAt: '2025-01-01' },
        { weight: 71.0, recordedAt: '2025-01-03' },
        { weight: 70.0, recordedAt: '2025-01-07' },
      ]);
      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.weight.startWeight).toBe(72.0);
      expect(result.weight.endWeight).toBe(70.0);
      expect(result.weight.change).toBe(-2.0);
    });

    it('should calculate meal statistics correctly', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-03');

      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([
        { calories: 2000, mealType: 'breakfast', totalProtein: 30, totalFat: 20, totalCarbs: 200 },
        { calories: 500, mealType: 'lunch', totalProtein: 25, totalFat: 15, totalCarbs: 50 },
        { calories: 800, mealType: 'dinner', totalProtein: 40, totalFat: 30, totalCarbs: 80 },
        { calories: null, mealType: 'snack', totalProtein: null, totalFat: null, totalCarbs: null },
      ]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.meals.totalCalories).toBe(3300);
      expect(result.meals.mealCount).toBe(4);
      expect(result.meals.averageCalories).toBeCloseTo(1100, 0);
      // New nutrient assertions
      expect(result.meals.totalProtein).toBe(95); // 30+25+40+0
      expect(result.meals.totalFat).toBe(65); // 20+15+30+0
      expect(result.meals.totalCarbs).toBe(330); // 200+50+80+0
    });

    it('should calculate nutrient totals with null values as zero', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-03');

      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([
        { calories: 500, mealType: 'breakfast', totalProtein: null, totalFat: null, totalCarbs: null },
        { calories: 600, mealType: 'lunch', totalProtein: 20, totalFat: 10, totalCarbs: 50 },
      ]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.meals.totalProtein).toBe(20); // null treated as 0
      expect(result.meals.totalFat).toBe(10);
      expect(result.meals.totalCarbs).toBe(50);
    });

    it('should return zero nutrients for empty meal records', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-03');

      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.meals.totalProtein).toBe(0);
      expect(result.meals.totalFat).toBe(0);
      expect(result.meals.totalCarbs).toBe(0);
    });

    it('should calculate exercise statistics correctly', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ベンチプレス', sets: 3, reps: 10 },
        { exerciseType: 'ベンチプレス', sets: 4, reps: 8 },
        { exerciseType: 'スクワット', sets: 3, reps: 12 },
        { exerciseType: 'ランジ', sets: 2, reps: 15 },
      ]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.exercises.totalSets).toBe(12); // 3+4+3+2
      expect(result.exercises.sessionCount).toBe(4);
      expect(result.exercises.byType['ベンチプレス'].sets).toBe(7); // 3+4
      expect(result.exercises.byType['スクワット'].sets).toBe(3);
      expect(result.exercises.byType['ランジ'].sets).toBe(2);
    });

    it('should handle empty data gracefully', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockDb.all.mockResolvedValue([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.weight.startWeight).toBeNull();
      expect(result.weight.endWeight).toBeNull();
      expect(result.weight.change).toBeNull();
      expect(result.meals.totalCalories).toBe(0);
      expect(result.meals.mealCount).toBe(0);
      expect(result.exercises.totalSets).toBe(0);
      expect(result.exercises.sessionCount).toBe(0);
    });
  });

  describe('getWeeklyTrend', () => {
    it('should return weekly aggregated data', async () => {
      const userId = 'user-123';
      const weeks = 4;

      mockDb.all.mockResolvedValue([
        { weight: 70.0, recordedAt: '2025-01-01' },
        { weight: 69.0, recordedAt: '2025-01-08' },
        { weight: 68.5, recordedAt: '2025-01-15' },
        { weight: 68.0, recordedAt: '2025-01-22' },
      ]);

      const result = await service.getWeeklyTrend(userId, weeks);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getGoalProgress', () => {
    it('should calculate progress toward goals', async () => {
      const userId = 'user-123';
      const goals = {
        targetWeight: 65.0,
        weeklyExerciseMinutes: 150,
        dailyCalories: 2000,
      };

      mockDb.all.mockResolvedValueOnce([{ weight: 68.0 }]);
      mockDb.all.mockResolvedValueOnce([{ total: 120 }]);
      mockDb.all.mockResolvedValueOnce([{ avg: 1950 }]);

      const result = await service.getGoalProgress(userId, goals);

      expect(result).toBeDefined();
      expect(result.weight).toBeDefined();
      expect(result.exercise).toBeDefined();
      expect(result.calories).toBeDefined();
    });
  });
});
