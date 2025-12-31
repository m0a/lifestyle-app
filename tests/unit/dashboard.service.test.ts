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
        { exerciseType: 'ランニング', durationMinutes: 30 },
        { exerciseType: 'ランニング', durationMinutes: 45 },
        { exerciseType: '筋トレ', durationMinutes: 60 },
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
        { calories: 2000, mealType: 'breakfast' },
        { calories: 500, mealType: 'lunch' },
        { calories: 800, mealType: 'dinner' },
        { calories: null, mealType: 'snack' },
      ]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.meals.totalCalories).toBe(3300);
      expect(result.meals.mealCount).toBe(4);
      expect(result.meals.averageCalories).toBeCloseTo(1100, 0);
    });

    it('should calculate exercise statistics correctly', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([]);
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ランニング', durationMinutes: 30 },
        { exerciseType: 'ランニング', durationMinutes: 45 },
        { exerciseType: '筋トレ', durationMinutes: 60 },
        { exerciseType: 'ヨガ', durationMinutes: 20 },
      ]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.exercises.totalMinutes).toBe(155);
      expect(result.exercises.sessionCount).toBe(4);
      expect(result.exercises.byType['ランニング']).toBe(75);
      expect(result.exercises.byType['筋トレ']).toBe(60);
      expect(result.exercises.byType['ヨガ']).toBe(20);
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
      expect(result.exercises.totalMinutes).toBe(0);
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
