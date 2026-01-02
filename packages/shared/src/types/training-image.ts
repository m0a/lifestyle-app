/**
 * Training Image Types
 * Data structures for generating shareable training record images
 */

/**
 * Complete training image data structure
 * Contains all information needed to render a training record image
 */
export interface TrainingImageData {
  /** Display date (e.g., "2026-01-02") */
  date: string;
  /** Title text (e.g., "WorkOut") */
  title: string;
  /** List of exercise cards to display */
  exercises: ExerciseCardData[];
  /** Footer text (e.g., "Powered by Lifestyle App") */
  footer: string;
}

/**
 * Individual exercise card data
 * Represents one exercise type with all its sets
 */
export interface ExerciseCardData {
  /** Exercise name (e.g., "ベンチプレス") */
  exerciseType: string;
  /** Maximum estimated 1RM for this exercise (highest across all sets) */
  maxRM: number;
  /** List of sets performed */
  sets: SetDetailData[];
}

/**
 * Individual set detail data
 * Contains weight, reps, calculated 1RM, and MAX RM flag
 */
export interface SetDetailData {
  /** Set number (1, 2, 3...) */
  setNumber: number;
  /** Weight in kg */
  weight: number;
  /** Number of repetitions */
  reps: number;
  /** Estimated 1RM using Epley formula */
  estimated1RM: number;
  /** True if this set's 1RM is a personal record */
  isMaxRM: boolean;
}

/**
 * Historical max RM record for a specific exercise type
 * Retrieved from backend API
 */
export interface MaxRMRecord {
  /** Exercise name */
  exerciseType: string;
  /** Historical maximum 1RM value */
  maxRM: number;
  /** Date when this record was achieved (ISO8601) */
  achievedAt: string;
}

/**
 * Response type for GET /api/exercises/max-rm
 */
export interface MaxRMResponse {
  maxRMs: MaxRMRecord[];
}
