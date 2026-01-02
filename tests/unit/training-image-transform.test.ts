import { describe, it, expect } from 'vitest';
import {
  transformToImageData,
  formatDateForImage,
} from '../../packages/frontend/src/lib/training-image-transform';
import type { ExerciseRecord, MaxRMRecord } from '@lifestyle-app/shared';

describe('transformToImageData', () => {
  const baseExercise: ExerciseRecord = {
    id: '1',
    userId: 'user1',
    exerciseType: 'ベンチプレス',
    muscleGroup: 'chest',
    setNumber: 1,
    reps: 10,
    weight: 60,
    variation: null,
    recordedAt: '2026-01-02T10:00:00.000Z',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };

  it('should transform single exercise with single set', () => {
    const exercises: ExerciseRecord[] = [baseExercise];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.date).toBe('2026-01-02');
    expect(result.title).toBe('WorkOut');
    expect(result.footer).toBe('https://lifestyle-tracker.abe00makoto.workers.dev');
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseType).toBe('ベンチプレス');
    expect(result.exercises[0].sets).toHaveLength(1);
    expect(result.exercises[0].sets[0].weight).toBe(60);
    expect(result.exercises[0].sets[0].reps).toBe(10);
  });

  it('should calculate 1RM correctly for each set', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, setNumber: 1, weight: 60, reps: 10 },
    ];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    // 60kg × 10 reps: 60 × (1 + 0.0333 × 10) = 60 × 1.333 = 79.98 → 80
    expect(result.exercises[0].sets[0].estimated1RM).toBe(80);
    expect(result.exercises[0].maxRM).toBe(80);
  });

  it('should handle multiple sets and find max RM', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '1', setNumber: 1, weight: 60, reps: 10 },
      { ...baseExercise, id: '2', setNumber: 2, weight: 70, reps: 8 },
      { ...baseExercise, id: '3', setNumber: 3, weight: 80, reps: 5 },
    ];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises[0].sets).toHaveLength(3);
    // 80kg × 5 reps: 80 × 1.1665 = 93.32 → 93
    expect(result.exercises[0].maxRM).toBe(93);
  });

  it('should sort sets by set number', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '3', setNumber: 3, weight: 80 },
      { ...baseExercise, id: '1', setNumber: 1, weight: 60 },
      { ...baseExercise, id: '2', setNumber: 2, weight: 70 },
    ];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises[0].sets[0].setNumber).toBe(1);
    expect(result.exercises[0].sets[1].setNumber).toBe(2);
    expect(result.exercises[0].sets[2].setNumber).toBe(3);
  });

  it('should handle multiple exercise types', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '1', exerciseType: 'ベンチプレス' },
      { ...baseExercise, id: '2', exerciseType: 'スクワット', muscleGroup: 'legs' },
    ];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises).toHaveLength(2);
    const types = result.exercises.map((e) => e.exerciseType);
    expect(types).toContain('ベンチプレス');
    expect(types).toContain('スクワット');
  });

  it('should mark isMaxRM when current exceeds historical max', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '1', setNumber: 1, weight: 100, reps: 5 },
    ];
    // Historical max is 100, current 1RM is 117 (100 × 1.1665)
    const maxRMRecords: MaxRMRecord[] = [
      { exerciseType: 'ベンチプレス', maxRM: 100, achievedAt: '2025-12-01T10:00:00.000Z' },
    ];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises[0].sets[0].isMaxRM).toBe(true);
  });

  it('should not mark isMaxRM when current is below historical max', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '1', setNumber: 1, weight: 60, reps: 10 },
    ];
    // Historical max is 100, current 1RM is 80
    const maxRMRecords: MaxRMRecord[] = [
      { exerciseType: 'ベンチプレス', maxRM: 100, achievedAt: '2025-12-01T10:00:00.000Z' },
    ];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises[0].sets[0].isMaxRM).toBe(false);
  });

  it('should handle bodyweight exercises (null weight)', () => {
    const exercises: ExerciseRecord[] = [
      { ...baseExercise, id: '1', exerciseType: '腕立て伏せ', weight: null, reps: 20 },
    ];
    const maxRMRecords: MaxRMRecord[] = [];

    const result = transformToImageData(exercises, '2026-01-02', maxRMRecords);

    expect(result.exercises[0].sets[0].weight).toBe(0);
    expect(result.exercises[0].sets[0].estimated1RM).toBe(0);
  });

  it('should return empty exercises array when no exercises provided', () => {
    const result = transformToImageData([], '2026-01-02', []);

    expect(result.exercises).toHaveLength(0);
    expect(result.date).toBe('2026-01-02');
    expect(result.title).toBe('WorkOut');
  });
});

describe('formatDateForImage', () => {
  it('should format ISO date string', () => {
    expect(formatDateForImage('2026-01-02T10:00:00.000Z')).toBe('2026/01/02');
  });

  it('should format YYYY-MM-DD date string', () => {
    expect(formatDateForImage('2026-01-02')).toBe('2026/01/02');
  });

  it('should pad single digit months and days', () => {
    expect(formatDateForImage('2026-03-05')).toBe('2026/03/05');
  });
});
