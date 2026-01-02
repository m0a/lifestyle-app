import type { ExerciseCardData } from '@lifestyle-app/shared';

export type ColorTheme = 'red' | 'blue' | 'green' | 'purple' | 'gray';

interface TrainingImageCardProps {
  data: ExerciseCardData;
  colorTheme?: ColorTheme;
}

const colorStyles: Record<ColorTheme, { border: string; borderLight: string; text: string; badge: string }> = {
  red: {
    border: 'border-red-500',
    borderLight: 'border-red-200',
    text: 'text-red-600',
    badge: 'bg-red-500',
  },
  blue: {
    border: 'border-blue-500',
    borderLight: 'border-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-500',
  },
  green: {
    border: 'border-green-500',
    borderLight: 'border-green-200',
    text: 'text-green-600',
    badge: 'bg-green-500',
  },
  purple: {
    border: 'border-purple-500',
    borderLight: 'border-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-500',
  },
  gray: {
    border: 'border-gray-700',
    borderLight: 'border-gray-300',
    text: 'text-gray-700',
    badge: 'bg-gray-700',
  },
};

/**
 * Individual exercise card component for training image
 * Displays exercise type, max RM, and all sets with their details
 */
export function TrainingImageCard({ data, colorTheme = 'red' }: TrainingImageCardProps) {
  const colors = colorStyles[colorTheme];

  return (
    <div className={`border-2 ${colors.border} rounded-lg mx-2 my-2 bg-white`}>
      {/* Exercise header */}
      <div className={`flex justify-between items-center px-3 py-2 border-b ${colors.borderLight}`}>
        <span className="font-bold text-gray-800">{data.exerciseType}</span>
        <span className={`${colors.text} font-semibold`}>RM {data.maxRM}kg</span>
      </div>

      {/* Sets list */}
      <div className="px-3 py-2 space-y-1">
        {data.sets.map((set) => (
          <div
            key={set.setNumber}
            className="flex items-center text-sm"
          >
            <span className="w-8 text-gray-500">{set.setNumber}</span>
            <span className="flex-1">
              <span className="font-medium">{set.weight}</span>
              <span className="text-gray-600">kg × </span>
              <span className="font-medium">{set.reps}</span>
              <span className="text-gray-600"> reps</span>
              <span className="text-gray-500 ml-2">(1RM: {set.estimated1RM})</span>
            </span>
            {set.isMaxRM && (
              <span className={`${colors.badge} text-white text-xs px-2 py-0.5 rounded font-bold ml-2`}>
                MAX RM
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
