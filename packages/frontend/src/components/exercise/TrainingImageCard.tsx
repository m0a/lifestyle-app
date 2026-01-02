import type { ExerciseCardData } from '@lifestyle-app/shared';

interface TrainingImageCardProps {
  data: ExerciseCardData;
}

/**
 * Individual exercise card component for training image
 * Displays exercise type, max RM, and all sets with their details
 */
export function TrainingImageCard({ data }: TrainingImageCardProps) {
  return (
    <div className="border-2 border-red-500 rounded-lg mx-2 my-2 bg-white">
      {/* Exercise header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-red-200">
        <span className="font-bold text-gray-800">{data.exerciseType}</span>
        <span className="text-red-600 font-semibold">RM {data.maxRM}kg</span>
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
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold ml-2">
                MAX RM
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
