// Exercise Import Types
// These types are used for the multi-exercise import feature

export interface ExerciseImportSummary {
  id: string;
  exerciseType: string;
  muscleGroup: string | null;
  totalSets: number;
  displaySets: string; // e.g., "3セット × 12回 @ 50kg"
  timestamp: string; // Time portion (HH:mm)
  recordedAt: string; // Full ISO timestamp
}

export interface RecentExerciseItem {
  id: string; // Most recent record ID
  exerciseType: string;
  muscleGroup: string | null;
  lastPerformedDate: string; // YYYY-MM-DD
  lastPerformedTime: string; // HH:mm
  preview: string; // e.g., "3セット, 50kg"
}

export interface ExerciseImportItem {
  id: string;
  exerciseType: string;
  muscleGroup: string | null;
  setNumber: number;
  reps: number;
  weight: number | null;
  variation: string | null;
  recordedAt: string; // ISO 8601
  createdAt: string;
}
