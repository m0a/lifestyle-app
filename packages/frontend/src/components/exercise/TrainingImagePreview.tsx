import { forwardRef } from 'react';
import type { TrainingImageData } from '@lifestyle-app/shared';
import { TrainingImageCard, type ColorTheme } from './TrainingImageCard';

interface TrainingImagePreviewProps {
  data: TrainingImageData;
  colorTheme?: ColorTheme;
}

const headerColors: Record<ColorTheme, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  purple: 'bg-purple-600',
  gray: 'bg-gray-700',
};

/**
 * Full training image preview component
 * This component renders the complete training record image with header, cards, and footer
 * Use forwardRef to allow parent components to capture this element for image generation
 */
export const TrainingImagePreview = forwardRef<HTMLDivElement, TrainingImagePreviewProps>(
  function TrainingImagePreview({ data, colorTheme = 'red' }, ref) {
    // Calculate if we need to adjust for many exercises
    const exerciseCount = data.exercises.length;
    const needsCompactMode = exerciseCount > 5;

    return (
      <div
        ref={ref}
        className="w-[360px] bg-white shadow-lg"
        style={{
          // Ensure consistent rendering for image generation
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div className={`${headerColors[colorTheme]} text-white py-2 px-4`}>
          <div className="text-center text-sm font-bold">
            {data.date} {data.title}
          </div>
        </div>

        {/* Exercise Cards */}
        <div className={`py-2 ${needsCompactMode ? 'space-y-1' : 'space-y-2'}`}>
          {data.exercises.length > 0 ? (
            data.exercises.map((exercise) => (
              <TrainingImageCard
                key={exercise.exerciseType}
                data={exercise}
                colorTheme={colorTheme}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              記録がありません
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
          {data.footer}
        </div>
      </div>
    );
  }
);

export type { ColorTheme };
