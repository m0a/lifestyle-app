// Meal types
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MEAL_TYPE_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

// Muscle groups for strength training
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  arms: '腕',
  core: '体幹',
  other: 'その他',
};

export interface ExercisePreset {
  name: string;
  muscleGroup: MuscleGroup;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // Chest
  { name: 'ベンチプレス', muscleGroup: 'chest' },
  { name: 'ダンベルフライ', muscleGroup: 'chest' },
  { name: 'プッシュアップ', muscleGroup: 'chest' },
  // Back
  { name: 'デッドリフト', muscleGroup: 'back' },
  { name: 'ラットプルダウン', muscleGroup: 'back' },
  { name: 'ベントオーバーロウ', muscleGroup: 'back' },
  // Legs
  { name: 'スクワット', muscleGroup: 'legs' },
  { name: 'レッグプレス', muscleGroup: 'legs' },
  { name: 'ランジ', muscleGroup: 'legs' },
  { name: 'カーフレイズ', muscleGroup: 'legs' },
  // Shoulders
  { name: 'ショルダープレス', muscleGroup: 'shoulders' },
  { name: 'サイドレイズ', muscleGroup: 'shoulders' },
  { name: 'フロントレイズ', muscleGroup: 'shoulders' },
  // Arms
  { name: 'バイセップカール', muscleGroup: 'arms' },
  { name: 'トライセップエクステンション', muscleGroup: 'arms' },
  // Core
  { name: 'プランク', muscleGroup: 'core' },
  { name: 'クランチ', muscleGroup: 'core' },
  { name: 'レッグレイズ', muscleGroup: 'core' },
];

// AI usage limits
export const AI_USAGE_LIMITS = {
  dailyTokenLimit: 10_000, // TEMPORARY: for production testing, revert to 50_000
  devDailyTokenLimit: 50_000,
  warningThresholdPercent: 80,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  weight: {
    min: 20,
    max: 300,
  },
  calories: {
    min: 0,
    max: 10000,
  },
  exerciseSets: {
    min: 1,
    max: 20,
  },
  exerciseReps: {
    min: 1,
    max: 100,
  },
  exerciseWeight: {
    min: 0,
    max: 500,
  },
  password: {
    min: 8,
    max: 100,
  },
  content: {
    min: 1,
    max: 1000,
  },
  exerciseType: {
    min: 1,
    max: 100,
  },
} as const;

// Dashboard periods
export const DASHBOARD_PERIODS = ['week', 'month'] as const;

export const DASHBOARD_PERIOD_LABELS: Record<(typeof DASHBOARD_PERIODS)[number], string> = {
  week: '週間',
  month: '月間',
};

// Date formats
export const DATE_FORMATS = {
  display: 'YYYY/MM/DD',
  api: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  date: 'YYYY-MM-DD',
} as const;
