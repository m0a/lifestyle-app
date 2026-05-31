import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        { calories: 2000, mealType: 'breakfast', recordedAt: '2025-01-01T08:00:00+09:00' },
        { calories: 1800, mealType: 'lunch', recordedAt: '2025-01-01T12:00:00+09:00' },
        { calories: 2200, mealType: 'dinner', recordedAt: '2025-01-02T19:00:00+09:00' },
      ]);

      // Mock exercise data (each record = 1 set). recordedAt is within
      // [startDate, endDate] so the local-date filter keeps them (#99).
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ベンチプレス', setNumber: 1, reps: 10, recordedAt: '2025-01-02T10:00:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 2, reps: 10, recordedAt: '2025-01-02T10:05:00+09:00' },
        { exerciseType: 'スクワット', setNumber: 1, reps: 12, recordedAt: '2025-01-03T18:00:00+09:00' },
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
      // All meals on same day (2025-01-01) = 1 day
      mockDb.all.mockResolvedValueOnce([
        { calories: 2000, mealType: 'breakfast', totalProtein: 30, totalFat: 20, totalCarbs: 200, recordedAt: '2025-01-01T08:00:00+09:00' },
        { calories: 500, mealType: 'lunch', totalProtein: 25, totalFat: 15, totalCarbs: 50, recordedAt: '2025-01-01T12:00:00+09:00' },
        { calories: 800, mealType: 'dinner', totalProtein: 40, totalFat: 30, totalCarbs: 80, recordedAt: '2025-01-01T19:00:00+09:00' },
        { calories: null, mealType: 'snack', totalProtein: null, totalFat: null, totalCarbs: null, recordedAt: '2025-01-01T15:00:00+09:00' },
      ]);
      mockDb.all.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.meals.totalCalories).toBe(3300);
      expect(result.meals.mealCount).toBe(4);
      // Daily average: 3300 / 1 day = 3300
      expect(result.meals.averageCalories).toBeCloseTo(3300, 0);
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
        { calories: 500, mealType: 'breakfast', totalProtein: null, totalFat: null, totalCarbs: null, recordedAt: '2025-01-01T08:00:00+09:00' },
        { calories: 600, mealType: 'lunch', totalProtein: 20, totalFat: 10, totalCarbs: 50, recordedAt: '2025-01-02T12:00:00+09:00' },
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
      // Each record = 1 set. Total: 7 ベンチプレス + 3 スクワット + 2 ランジ = 12 sets.
      // recordedAt is within [startDate, endDate] so the local-date filter keeps them (#99).
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ベンチプレス', setNumber: 1, reps: 10, recordedAt: '2025-01-02T10:00:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 2, reps: 10, recordedAt: '2025-01-02T10:05:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 3, reps: 10, recordedAt: '2025-01-02T10:10:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 1, reps: 8, recordedAt: '2025-01-04T10:00:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 2, reps: 8, recordedAt: '2025-01-04T10:05:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 3, reps: 8, recordedAt: '2025-01-04T10:10:00+09:00' },
        { exerciseType: 'ベンチプレス', setNumber: 4, reps: 8, recordedAt: '2025-01-04T10:15:00+09:00' },
        { exerciseType: 'スクワット', setNumber: 1, reps: 12, recordedAt: '2025-01-05T18:00:00+09:00' },
        { exerciseType: 'スクワット', setNumber: 2, reps: 12, recordedAt: '2025-01-05T18:05:00+09:00' },
        { exerciseType: 'スクワット', setNumber: 3, reps: 12, recordedAt: '2025-01-05T18:10:00+09:00' },
        { exerciseType: 'ランジ', setNumber: 1, reps: 15, recordedAt: '2025-01-06T19:00:00+09:00' },
        { exerciseType: 'ランジ', setNumber: 2, reps: 15, recordedAt: '2025-01-06T19:05:00+09:00' },
      ]);

      const result = await service.getSummary(userId, { startDate, endDate });

      expect(result.exercises.totalSets).toBe(12); // 7+3+2
      expect(result.exercises.sessionCount).toBe(12); // Each record is a session (set)
      expect(result.exercises.byType['ベンチプレス'].sets).toBe(7);
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

      // Real row shapes carry recordedAt (the local-date filter reads it, #99).
      // Use "now" so the records fall inside the trailing-7-day window.
      const recentISO = new Date().toISOString();
      mockDb.all.mockResolvedValueOnce([{ weight: 68.0 }]); // latest weight (no date filter)
      mockDb.all.mockResolvedValueOnce([{ reps: 10, recordedAt: recentISO }]); // weekly exercises
      mockDb.all.mockResolvedValueOnce([{ calories: 1950, recordedAt: recentISO }]); // weekly meals

      const result = await service.getGoalProgress(userId, goals);

      expect(result).toBeDefined();
      expect(result.weight.current).toBe(68.0);
      // One in-window exercise record => 1 set; one meal of 1950 on a single
      // local day => daily average 1950 (locks the local-date filter output).
      expect(result.exercise.currentSets).toBe(1);
      expect(result.calories.average).toBe(1950);
    });
  });

  // Regression for #99: aggregation must bucket records by their LOCAL date,
  // not by a UTC ("Z") vs "+09:00" lexicographic string compare. Under the old
  // code the boundary used startDate.toISOString() (a "Z" instant), which
  // dropped/mixed records near the day edge.
  describe('timezone boundary (#99)', () => {
    it('getSummary keeps JST same-day edge records and drops the previous local day', async () => {
      const userId = 'user-tz';
      // Frontend asks for local day 2026-01-17; the route builds new Date('2026-01-17').
      const startDate = new Date('2026-01-17');
      const endDate = new Date('2026-01-17');

      mockDb.all.mockResolvedValueOnce([]); // weights
      mockDb.all.mockResolvedValueOnce([
        // 23:30 JST on Jan 17 (14:30Z same day): the old end-bound (Z midnight)
        // dropped this true same-day record.
        { calories: 700, mealType: 'dinner', totalProtein: 0, totalFat: 0, totalCarbs: 0, recordedAt: '2026-01-17T23:30:00+09:00' },
        // 07:00 JST on Jan 17 (22:00Z on the 16th): still belongs to Jan 17.
        { calories: 300, mealType: 'breakfast', totalProtein: 0, totalFat: 0, totalCarbs: 0, recordedAt: '2026-01-17T07:00:00+09:00' },
        // Previous local day — must be excluded.
        { calories: 999, mealType: 'dinner', totalProtein: 0, totalFat: 0, totalCarbs: 0, recordedAt: '2026-01-16T23:30:00+09:00' },
      ]);
      mockDb.all.mockResolvedValueOnce([]); // exercises

      const result = await service.getSummary(userId, { startDate, endDate });

      // Both Jan-17 records counted; the Jan-16 one excluded. (Old code returned
      // all 3 because the SQL bound is a no-op against the mock and there was no
      // local-date filter.)
      expect(result.meals.mealCount).toBe(2);
      expect(result.meals.totalCalories).toBe(1000);
    });

    // getWeeklyTrend / getGoalProgress use a "now"-relative window, so pin the
    // clock to make the local-date bucketing deterministic.
    describe('now-relative windows', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        // 2026-01-17T05:00:00Z = 2026-01-17 14:00 JST
        vi.setSystemTime(new Date('2026-01-17T05:00:00Z'));
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it('getWeeklyTrend buckets a late-night JST record into the correct week', async () => {
        // weeks=1 => single window: local 2026-01-11 .. 2026-01-17
        mockDb.all.mockResolvedValueOnce([
          { weight: 70.0, recordedAt: '2026-01-17T23:30:00+09:00' }, // local 01-17, in week
        ]); // allWeights
        mockDb.all.mockResolvedValueOnce([
          { calories: 500, recordedAt: '2026-01-17T23:30:00+09:00' }, // in week (late-night JST)
          { calories: 999, recordedAt: '2026-01-10T12:00:00+09:00' }, // local 01-10, before weekStart
        ]); // allMeals
        mockDb.all.mockResolvedValueOnce([
          { recordedAt: '2026-01-17T07:00:00+09:00' }, // local 01-17, in week
        ]); // allExercises

        const result = await service.getWeeklyTrend('user-tz', 1);

        expect(result).toHaveLength(1);
        expect(result[0]!.weekStart).toBe('2026-01-11');
        expect(result[0]!.weekEnd).toBe('2026-01-17');
        // Late-night JST record kept; the 01-10 record dropped.
        expect(result[0]!.totalCalories).toBe(500);
        expect(result[0]!.exerciseSets).toBe(1);
        expect(result[0]!.weight).toBe(70.0);
      });

      it('getGoalProgress filters by local date and averages calories per local day', async () => {
        // now=2026-01-17T05:00:00Z => weekStart (local) = 2026-01-10
        mockDb.all.mockResolvedValueOnce([{ weight: 68.0 }]); // latest weight
        mockDb.all.mockResolvedValueOnce([
          { reps: 10, recordedAt: '2026-01-17T23:30:00+09:00' }, // local 01-17 >= 01-10 => kept
          { reps: 8, recordedAt: '2026-01-09T12:00:00+09:00' }, // local 01-09 < 01-10 => dropped
        ]); // weekly exercises
        mockDb.all.mockResolvedValueOnce([
          { calories: 1950, recordedAt: '2026-01-17T23:30:00+09:00' }, // kept; one local day
        ]); // weekly meals

        const result = await service.getGoalProgress('user-tz', {
          targetWeight: 65,
          dailyCalories: 2000,
        });

        // Edge record kept, stale (pre-window) one dropped.
        expect(result.exercise.currentSets).toBe(1);
        // 1950 over a single local day.
        expect(result.calories.average).toBe(1950);
      });
    });
  });
});
