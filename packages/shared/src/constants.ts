// Delimiter used when deriving a meal's `content` string by concatenating its
// food-item names. `content` is non-normalized (a denormalized display label),
// so every derivation path must use the same separator to stay consistent
// across photo / chat / manual flows (#106). Note: `content` is dual-purpose —
// for AI/photo meals it is this derived join, for manual meals it is the user's
// free-text input — so this constant only governs the derived paths.
export const MEAL_CONTENT_DELIMITER = '、';

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
  dailyTokenLimit: 50_000,
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

// Targets for the meal tab's "この1週間" weekly evaluation card. Tuned for the
// user's fatty-liver plan where fat SHARE (not total calories) is the lever, so
// the PFC band is the primary signal. Adjust here — the values are echoed to the
// client via the weekly-summary API so the card renders bands without its own copy.
export const WEEKLY_MEAL_TARGETS = {
  windowDays: 7,
  dailyCalorieLimit: 1750, // metric 1: green if avg daily calories ≤ this
  proteinPct: 20, // metric 2: protein should be ≥ this share of macro-kcal
  fatPct: 30, // metric 2/4: fat should be ≤ this share; a day above it is "high-fat"
  carbsPct: 50, // metric 2: reference band (~50%), not pass/fail
  proteinFloorPerDay: 90, // metric 3: a day "achieves" when total protein ≥ this (g)
  highFatDaysLimit: 2, // metric 4: at most this many high-fat days per week
  weightMaWindow: 7, // metric 5: window for the weight moving average
  exerciseDaysTarget: 2, // metric 7: aim for at least this many exercise days per week
} as const;

// Date formats
export const DATE_FORMATS = {
  display: 'YYYY/MM/DD',
  api: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  date: 'YYYY-MM-DD',
} as const;
