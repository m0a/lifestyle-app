import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIUsageService } from '../../packages/backend/src/services/ai-usage';

describe('AIUsageService', () => {
  let service: AIUsageService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    service = new AIUsageService(mockDb);
  });

  describe('recordUsage', () => {
    it('should insert usage record with correct values', async () => {
      const userId = 'user-123';
      const featureType = 'image_analysis' as const;
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      await service.recordUsage(userId, featureType, usage);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          featureType: 'image_analysis',
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        })
      );
      // Verify id and createdAt are also present (generated values)
      const call = mockDb.values.mock.calls[0][0];
      expect(call.id).toBeDefined();
      expect(call.createdAt).toBeDefined();
    });

    it('should record text_analysis feature type', async () => {
      const userId = 'user-456';
      const featureType = 'text_analysis' as const;
      const usage = {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
      };

      await service.recordUsage(userId, featureType, usage);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          featureType: 'text_analysis',
        })
      );
    });

    it('should record chat feature type', async () => {
      const userId = 'user-789';
      const featureType = 'chat' as const;
      const usage = {
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      };

      await service.recordUsage(userId, featureType, usage);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          featureType: 'chat',
        })
      );
    });

    it('should not throw on database error (fire-and-forget)', async () => {
      mockDb.values.mockRejectedValue(new Error('Database error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const userId = 'user-123';
      const featureType = 'chat' as const;
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      // Should not throw
      await expect(service.recordUsage(userId, featureType, usage)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to record AI usage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getSummary', () => {
    it('should return total and monthly tokens', async () => {
      const userId = 'user-123';

      // Mock total query
      mockDb.where.mockResolvedValueOnce([{ total: 5000 }]);
      // Mock monthly query
      mockDb.where.mockResolvedValueOnce([{ total: 1500 }]);

      const result = await service.getSummary(userId);

      expect(result.totalTokens).toBe(5000);
      expect(result.monthlyTokens).toBe(1500);
    });

    it('should return zero for users with no usage', async () => {
      const userId = 'new-user';

      // Mock empty results
      mockDb.where.mockResolvedValueOnce([{ total: 0 }]);
      mockDb.where.mockResolvedValueOnce([{ total: 0 }]);

      const result = await service.getSummary(userId);

      expect(result.totalTokens).toBe(0);
      expect(result.monthlyTokens).toBe(0);
    });

    it('should handle null/undefined from COALESCE gracefully', async () => {
      const userId = 'user-123';

      // Mock null results (edge case)
      mockDb.where.mockResolvedValueOnce([{ total: null }]);
      mockDb.where.mockResolvedValueOnce([{ total: undefined }]);

      const result = await service.getSummary(userId);

      expect(result.totalTokens).toBe(0);
      expect(result.monthlyTokens).toBe(0);
    });

    it('should handle empty result array', async () => {
      const userId = 'user-123';

      // Mock empty arrays
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.getSummary(userId);

      expect(result.totalTokens).toBe(0);
      expect(result.monthlyTokens).toBe(0);
    });
  });
});
