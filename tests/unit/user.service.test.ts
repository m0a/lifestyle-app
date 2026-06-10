import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../packages/backend/src/services/user';

// Mock the database (chainable query builder)
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
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

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('counts records via SQL COUNT(*) instead of fetching every row (#120)', async () => {
      // Each .all() resolves a single COUNT(*) row, not the full record set
      mockDb.all
        .mockResolvedValueOnce([{ count: 12 }]) // weight_records
        .mockResolvedValueOnce([{ count: 34 }]) // meal_records
        .mockResolvedValueOnce([{ count: 5 }]); // exercise_records

      const service = new UserService(mockDb as never);
      const stats = await service.getStats('user-123');

      expect(stats).toEqual({
        weightRecords: 12,
        mealRecords: 34,
        exerciseRecords: 5,
        totalRecords: 51,
      });
      expect(mockDb.all).toHaveBeenCalledTimes(3);
    });

    it('returns zeros when the user has no records', async () => {
      mockDb.all
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      const service = new UserService(mockDb as never);
      const stats = await service.getStats('user-123');

      expect(stats).toEqual({
        weightRecords: 0,
        mealRecords: 0,
        exerciseRecords: 0,
        totalRecords: 0,
      });
    });
  });
});
