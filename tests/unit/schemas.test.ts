import { describe, it, expect } from 'vitest';
import {
  createWeightSchema,
  createMealSchema,
  createExerciseSchema,
} from '../../packages/shared/src/schemas';

describe('Schema datetime validation', () => {
  describe('createWeightSchema', () => {
    it('should accept full ISO datetime format', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: '2025-12-31T10:13:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept ISO datetime without milliseconds', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: '2025-12-31T10:13:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept datetime-local format (no timezone)', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: '2025-12-31T10:13',
      });
      expect(result.success).toBe(true);
    });

    it('should accept datetime-local format with seconds', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: '2025-12-31T10:13:45',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime format', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept datetime with timezone offset', () => {
      const result = createWeightSchema.safeParse({
        weight: 70.5,
        recordedAt: '2025-12-31T10:44:00+09:00',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createMealSchema', () => {
    it('should accept datetime-local format', () => {
      const result = createMealSchema.safeParse({
        mealType: 'breakfast',
        content: 'チキンラーメン',
        calories: 350,
        recordedAt: '2025-12-31T10:13',
      });
      expect(result.success).toBe(true);
    });

    it('should accept full ISO datetime format', () => {
      const result = createMealSchema.safeParse({
        mealType: 'lunch',
        content: '牛丼',
        recordedAt: '2025-12-31T12:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createExerciseSchema', () => {
    it('should accept datetime-local format', () => {
      const result = createExerciseSchema.safeParse({
        exerciseType: 'ベンチプレス',
        sets: 3,
        reps: 10,
        weight: 60,
        recordedAt: '2025-12-31T07:00',
      });
      expect(result.success).toBe(true);
    });

    it('should accept full ISO datetime format', () => {
      const result = createExerciseSchema.safeParse({
        exerciseType: 'スクワット',
        sets: 4,
        reps: 12,
        weight: null,
        recordedAt: '2025-12-31T18:30:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept exercise without weight (bodyweight)', () => {
      const result = createExerciseSchema.safeParse({
        exerciseType: '腕立て伏せ',
        sets: 3,
        reps: 20,
        recordedAt: '2025-12-31T07:00',
      });
      expect(result.success).toBe(true);
    });
  });
});
