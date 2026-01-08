import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseService } from '../../packages/backend/src/services/exercise';

// Mock database for testing
const createMockDb = () => {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
};

// Integration tests for Exercise Import API
// These tests verify the aggregation logic and service behavior

describe('Exercise Import API Integration Tests', () => {
  let exerciseService: ExerciseService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDb();
    exerciseService = new ExerciseService(mockDb);
  });

  describe('aggregateExerciseSets', () => {
    it('should aggregate multiple sets by exercise type', () => {
      // Given: 3 sets of bench press
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 2,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '3',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 3,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
      ];

      // When: Aggregate the sets
      const result = exerciseService.aggregateExerciseSets(exercises);

      // Then: Should return single summary with totalSets=3
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        exerciseType: 'ベンチプレス',
        muscleGroup: 'chest',
        totalSets: 3,
        displaySets: '3セット × 10回 @ 50kg',
        timestamp: '10:00',
        recordedAt: '2026-01-05T10:00:00.000Z',
      });
    });

    it('should return empty array for no exercises', () => {
      // Given: No exercises
      const exercises: any[] = [];

      // When: Aggregate
      const result = exerciseService.aggregateExerciseSets(exercises);

      // Then: Should return empty array
      expect(result).toHaveLength(0);
    });

    it('should handle bodyweight exercises without weight', () => {
      // Given: 2 sets of pull-ups (bodyweight)
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'プルアップ',
          muscleGroup: 'back',
          setNumber: 1,
          reps: 8,
          weight: null,
          variation: null,
          recordedAt: '2026-01-05T11:00:00.000Z',
          createdAt: '2026-01-05T11:00:00.000Z',
          updatedAt: '2026-01-05T11:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'プルアップ',
          muscleGroup: 'back',
          setNumber: 2,
          reps: 8,
          weight: null,
          variation: null,
          recordedAt: '2026-01-05T11:00:00.000Z',
          createdAt: '2026-01-05T11:00:00.000Z',
          updatedAt: '2026-01-05T11:00:00.000Z',
        },
      ];

      // When: Aggregate
      const result = exerciseService.aggregateExerciseSets(exercises);

      // Then: Should format without weight
      expect(result).toHaveLength(1);
      expect(result[0]?.displaySets).toBe('2セット × 8回');
    });

    it('should handle varying reps and weights', () => {
      // Given: 3 sets with different weights
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'スクワット',
          muscleGroup: 'legs',
          setNumber: 1,
          reps: 10,
          weight: 60,
          variation: null,
          recordedAt: '2026-01-05T12:00:00.000Z',
          createdAt: '2026-01-05T12:00:00.000Z',
          updatedAt: '2026-01-05T12:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'スクワット',
          muscleGroup: 'legs',
          setNumber: 2,
          reps: 10,
          weight: 65,
          variation: null,
          recordedAt: '2026-01-05T12:00:00.000Z',
          createdAt: '2026-01-05T12:00:00.000Z',
          updatedAt: '2026-01-05T12:00:00.000Z',
        },
        {
          id: '3',
          userId: 'user1',
          exerciseType: 'スクワット',
          muscleGroup: 'legs',
          setNumber: 3,
          reps: 10,
          weight: 70,
          variation: null,
          recordedAt: '2026-01-05T12:00:00.000Z',
          createdAt: '2026-01-05T12:00:00.000Z',
          updatedAt: '2026-01-05T12:00:00.000Z',
        },
      ];

      // When: Aggregate
      const result = exerciseService.aggregateExerciseSets(exercises);

      // Then: Should show weight range
      expect(result).toHaveLength(1);
      expect(result[0]?.displaySets).toBe('3セット × 10回 @ 60-70kg');
    });

    it('should separate exercises by recordedAt timestamp', () => {
      // Given: Same exercise type but different timestamps (morning and evening)
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'ディップス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 12,
          weight: null,
          variation: null,
          recordedAt: '2026-01-05T08:00:00.000Z',
          createdAt: '2026-01-05T08:00:00.000Z',
          updatedAt: '2026-01-05T08:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'ディップス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 10,
          weight: null,
          variation: null,
          recordedAt: '2026-01-05T18:00:00.000Z',
          createdAt: '2026-01-05T18:00:00.000Z',
          updatedAt: '2026-01-05T18:00:00.000Z',
        },
      ];

      // When: Aggregate
      const result = exerciseService.aggregateExerciseSets(exercises);

      // Then: Should return 2 separate summaries
      expect(result).toHaveLength(2);
      expect(result[0]?.timestamp).toBe('18:00'); // Sorted by recordedAt desc
      expect(result[1]?.timestamp).toBe('08:00');
    });
  });

  describe('getRecentUniqueExercises', () => {
    it('should return unique exercises by type', () => {
      // Given: Multiple sets of same exercises across different dates
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 2,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '3',
          userId: 'user1',
          exerciseType: 'スクワット',
          muscleGroup: 'legs',
          setNumber: 1,
          reps: 12,
          weight: 60,
          variation: null,
          recordedAt: '2026-01-04T10:00:00.000Z',
          createdAt: '2026-01-04T10:00:00.000Z',
          updatedAt: '2026-01-04T10:00:00.000Z',
        },
        {
          id: '4',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 8,
          weight: 55,
          variation: null,
          recordedAt: '2026-01-03T10:00:00.000Z',
          createdAt: '2026-01-03T10:00:00.000Z',
          updatedAt: '2026-01-03T10:00:00.000Z',
        },
      ];

      // When: Get recent unique exercises
      const result = exerciseService.getRecentUniqueExercises(exercises, 10);

      // Then: Should return 2 unique exercises (ベンチプレス, スクワット)
      expect(result).toHaveLength(2);
      expect(result[0]?.exerciseType).toBe('ベンチプレス');
      expect(result[0]?.lastPerformedDate).toBe('2026-01-05');
      expect(result[1]?.exerciseType).toBe('スクワット');
      expect(result[1]?.lastPerformedDate).toBe('2026-01-04');
    });

    it('should respect the limit parameter', () => {
      // Given: 5 different exercises
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'スクワット',
          muscleGroup: 'legs',
          setNumber: 1,
          reps: 12,
          weight: 60,
          variation: null,
          recordedAt: '2026-01-04T10:00:00.000Z',
          createdAt: '2026-01-04T10:00:00.000Z',
          updatedAt: '2026-01-04T10:00:00.000Z',
        },
        {
          id: '3',
          userId: 'user1',
          exerciseType: 'デッドリフト',
          muscleGroup: 'back',
          setNumber: 1,
          reps: 8,
          weight: 100,
          variation: null,
          recordedAt: '2026-01-03T10:00:00.000Z',
          createdAt: '2026-01-03T10:00:00.000Z',
          updatedAt: '2026-01-03T10:00:00.000Z',
        },
        {
          id: '4',
          userId: 'user1',
          exerciseType: 'プルアップ',
          muscleGroup: 'back',
          setNumber: 1,
          reps: 10,
          weight: null,
          variation: null,
          recordedAt: '2026-01-02T10:00:00.000Z',
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
        {
          id: '5',
          userId: 'user1',
          exerciseType: 'ショルダープレス',
          muscleGroup: 'shoulders',
          setNumber: 1,
          reps: 10,
          weight: 20,
          variation: null,
          recordedAt: '2026-01-01T10:00:00.000Z',
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      ];

      // When: Get recent unique exercises with limit=3
      const result = exerciseService.getRecentUniqueExercises(exercises, 3);

      // Then: Should return only 3 exercises
      expect(result).toHaveLength(3);
      expect(result[0]?.exerciseType).toBe('ベンチプレス');
      expect(result[1]?.exerciseType).toBe('スクワット');
      expect(result[2]?.exerciseType).toBe('デッドリフト');
    });

    it('should return empty array for no exercises', () => {
      // Given: No exercises
      const exercises: any[] = [];

      // When: Get recent unique exercises
      const result = exerciseService.getRecentUniqueExercises(exercises, 10);

      // Then: Should return empty array
      expect(result).toHaveLength(0);
    });

    it('should format preview string correctly', () => {
      // Given: Exercise with multiple sets
      const exercises = [
        {
          id: '1',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 1,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '2',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 2,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
        {
          id: '3',
          userId: 'user1',
          exerciseType: 'ベンチプレス',
          muscleGroup: 'chest',
          setNumber: 3,
          reps: 10,
          weight: 50,
          variation: null,
          recordedAt: '2026-01-05T10:00:00.000Z',
          createdAt: '2026-01-05T10:00:00.000Z',
          updatedAt: '2026-01-05T10:00:00.000Z',
        },
      ];

      // When: Get recent unique exercises
      const result = exerciseService.getRecentUniqueExercises(exercises, 10);

      // Then: Should format preview as "3セット, 50kg"
      expect(result).toHaveLength(1);
      expect(result[0]?.preview).toBe('3セット, 50kg');
    });
  });
});
