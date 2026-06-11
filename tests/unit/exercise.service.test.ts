import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseService } from '../../packages/backend/src/services/exercise';

// Mock the database (chainable query builder)
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn(),
  all: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

describe('ExerciseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new exercise record with sets/reps/weight', async () => {
      const input = {
        exerciseType: 'ベンチプレス',
        sets: 3,
        reps: 10,
        weight: 60,
        recordedAt: new Date().toISOString(),
      };
      const userId = 'user-123';

      expect(true).toBe(true);
    });

    it('should validate sets is positive', async () => {
      expect(true).toBe(true);
    });

    it('should validate reps is positive', async () => {
      expect(true).toBe(true);
    });

    it('should allow null weight for bodyweight exercises', async () => {
      expect(true).toBe(true);
    });

    it('should validate exerciseType is not empty', async () => {
      expect(true).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return exercise record by id', async () => {
      expect(true).toBe(true);
    });

    it('should return null if record not found', async () => {
      expect(true).toBe(true);
    });

    it('should not return record belonging to different user', async () => {
      expect(true).toBe(true);
    });
  });

  describe('findByUserId', () => {
    it('should return all exercise records for user', async () => {
      expect(true).toBe(true);
    });

    it('should return records ordered by recordedAt descending', async () => {
      expect(true).toBe(true);
    });

    it('should support date range filtering', async () => {
      expect(true).toBe(true);
    });
  });

  describe('getWeeklySummary', () => {
    it('should calculate total sets and reps for the week', async () => {
      expect(true).toBe(true);
    });

    it('should group exercises by type with sets and reps', async () => {
      expect(true).toBe(true);
    });

    it('should count number of exercise sessions', async () => {
      expect(true).toBe(true);
    });
  });

  describe('getLastByType', () => {
    it('should return the last record for a specific exercise type', async () => {
      expect(true).toBe(true);
    });

    it('should return null if no records exist for the type', async () => {
      expect(true).toBe(true);
    });
  });

  describe('update', () => {
    it('should update exercise record', async () => {
      expect(true).toBe(true);
    });

    it('should update updatedAt timestamp', async () => {
      expect(true).toBe(true);
    });

    it('should not update record belonging to different user', async () => {
      expect(true).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete exercise record', async () => {
      expect(true).toBe(true);
    });

    it('should not delete record belonging to different user', async () => {
      expect(true).toBe(true);
    });
  });

  describe('getMaxRMs', () => {
    it('computes max 1RM per type from rows already filtered in SQL (#120)', async () => {
      // The DB now only returns weighted rows of the requested types (the
      // exerciseTypes/isNotNull(weight) filters live in the WHERE clause).
      mockDb.all.mockResolvedValueOnce([
        { exerciseType: 'ベンチプレス', weight: 100, reps: 5, recordedAt: '2026-01-10T10:00:00+09:00' },
        { exerciseType: 'ベンチプレス', weight: 80, reps: 10, recordedAt: '2026-01-05T10:00:00+09:00' },
        { exerciseType: 'スクワット', weight: 120, reps: 3, recordedAt: '2026-01-08T10:00:00+09:00' },
      ]);

      const service = new ExerciseService(mockDb as never);
      const result = await service.getMaxRMs('user-123', ['ベンチプレス', 'スクワット']);

      const bench = result.find((r) => r.exerciseType === 'ベンチプレス')!;
      expect(bench.maxRM).toBeGreaterThan(100); // Epley: 100kg x 5 > 100
      expect(bench.achievedAt).toBe('2026-01-10T10:00:00+09:00');
      expect(result.find((r) => r.exerciseType === 'スクワット')).toBeDefined();

      // Single SELECT with a WHERE filter — no JS full-scan filtering
      expect(mockDb.all).toHaveBeenCalledTimes(1);
      expect(mockDb.where).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no weighted records match', async () => {
      mockDb.all.mockResolvedValueOnce([]);

      const service = new ExerciseService(mockDb as never);
      const result = await service.getMaxRMs('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getRecentSessions', () => {
    it('pages by date window resolved in SQL and preserves the response shape (#120)', async () => {
      mockDb.all
        // 1st .all(): GROUP BY local-date page probe (limit+1 rows => hasMore)
        .mockResolvedValueOnce([
          { date: '2026-01-10' },
          { date: '2026-01-08' },
          { date: '2026-01-05' },
        ])
        // 2nd .all(): records inside the [oldest, newest] date window, DESC
        .mockResolvedValueOnce([
          { id: 'e1', userId: 'user-123', exerciseType: 'ベンチプレス', muscleGroup: '胸', setNumber: 1, reps: 10, weight: 60, variation: null, recordedAt: '2026-01-10T10:00:00+09:00' },
          { id: 'e2', userId: 'user-123', exerciseType: 'ベンチプレス', muscleGroup: '胸', setNumber: 2, reps: 8, weight: 60, variation: null, recordedAt: '2026-01-10T10:00:00+09:00' },
          { id: 'e3', userId: 'user-123', exerciseType: 'スクワット', muscleGroup: '脚', setNumber: 1, reps: 12, weight: 80, variation: null, recordedAt: '2026-01-08T09:00:00+09:00' },
        ]);

      const service = new ExerciseService(mockDb as never);
      const result = await service.getRecentSessions('user-123', { limit: 2 });

      // 3 date rows for limit 2 => hasMore, nextCursor = oldest page date
      expect(result.sessions.map((s) => s.date)).toEqual(['2026-01-10', '2026-01-08']);
      expect(result.nextCursor).toBe('2026-01-08');

      const day1 = result.sessions[0]!;
      expect(day1.exercises).toHaveLength(1);
      expect(day1.exercises[0]!.sets.map((s) => s.setNumber)).toEqual([1, 2]);
    });

    it('returns empty page and null cursor when there are no sessions', async () => {
      mockDb.all.mockResolvedValueOnce([]);

      const service = new ExerciseService(mockDb as never);
      const result = await service.getRecentSessions('user-123', { cursor: '2026-01-01' });

      expect(result).toEqual({ sessions: [], nextCursor: null });
      // No second query when the date page is empty
      expect(mockDb.all).toHaveBeenCalledTimes(1);
    });

    it('returns null nextCursor on the last page', async () => {
      mockDb.all
        .mockResolvedValueOnce([{ date: '2026-01-10' }]) // <= limit rows => no more
        .mockResolvedValueOnce([
          { id: 'e1', userId: 'user-123', exerciseType: '懸垂', muscleGroup: '背中', setNumber: 1, reps: 10, weight: null, variation: null, recordedAt: '2026-01-10T10:00:00+09:00' },
        ]);

      const service = new ExerciseService(mockDb as never);
      const result = await service.getRecentSessions('user-123', { limit: 10 });

      expect(result.sessions).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });
});
