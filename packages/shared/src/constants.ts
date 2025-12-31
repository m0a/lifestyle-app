// Meal types
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MEAL_TYPE_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

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
  exerciseDuration: {
    min: 1,
    max: 1440, // 24 hours in minutes
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
