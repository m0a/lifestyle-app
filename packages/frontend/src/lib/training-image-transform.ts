import { calculate1RM, isMaxRM } from '@lifestyle-app/shared';
import type {
  ExerciseRecord,
  TrainingImageData,
  ExerciseCardData,
  SetDetailData,
  MaxRMRecord,
} from '@lifestyle-app/shared';

/**
 * Transform exercise records into training image data structure
 *
 * @param exercises - Exercise records for a specific date
 * @param date - The date string to display (e.g., "2026-01-02")
 * @param maxRMRecords - Historical max RM records for comparison
 * @returns TrainingImageData ready for rendering
 */
export function transformToImageData(
  exercises: ExerciseRecord[],
  date: string,
  maxRMRecords: MaxRMRecord[]
): TrainingImageData {
  // Create a map for quick max RM lookup
  const maxRMMap = new Map<string, number>();
  for (const record of maxRMRecords) {
    maxRMMap.set(record.exerciseType, record.maxRM);
  }

  // Group exercises by type
  const exercisesByType = new Map<string, ExerciseRecord[]>();
  for (const exercise of exercises) {
    const existing = exercisesByType.get(exercise.exerciseType) ?? [];
    existing.push(exercise);
    exercisesByType.set(exercise.exerciseType, existing);
  }

  // Transform each exercise type into a card
  const exerciseCards: ExerciseCardData[] = [];

  for (const [exerciseType, records] of exercisesByType) {
    // Sort by set number
    const sortedRecords = [...records].sort((a, b) => a.setNumber - b.setNumber);

    // Calculate 1RM for each set and find max
    const sets: SetDetailData[] = [];
    let cardMaxRM = 0;
    const historicalMax = maxRMMap.get(exerciseType) ?? 0;

    for (const record of sortedRecords) {
      // Skip bodyweight exercises (no weight)
      const weight = record.weight ?? 0;
      const estimated1RM = calculate1RM(weight, record.reps);

      if (estimated1RM > cardMaxRM) {
        cardMaxRM = estimated1RM;
      }

      sets.push({
        setNumber: record.setNumber,
        weight,
        reps: record.reps,
        estimated1RM,
        isMaxRM: isMaxRM(estimated1RM, historicalMax),
      });
    }

    exerciseCards.push({
      exerciseType,
      maxRM: cardMaxRM,
      sets,
    });
  }

  return {
    date,
    title: 'WorkOut',
    exercises: exerciseCards,
    footer: 'https://lifestyle-tracker.abe00makoto.workers.dev',
  };
}

/**
 * Format a date string for display in the image header
 * @param dateStr - ISO date string or YYYY-MM-DD format
 * @returns Formatted date string (e.g., "2026/01/02")
 */
export function formatDateForImage(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
