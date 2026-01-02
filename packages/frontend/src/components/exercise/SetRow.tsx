import { calculateRM } from '../../lib/exercise-utils';

interface SetRowProps {
  setNumber: number;
  reps: number;
  weight: number | null;
  variation?: string | null;
  onRepsChange: (reps: number) => void;
  onWeightChange: (weight: number | null) => void;
  onVariationChange?: (variation: string) => void;
  onRemove?: () => void;
  showVariation?: boolean;
  isRemovable?: boolean;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  variation,
  onRepsChange,
  onWeightChange,
  onVariationChange,
  onRemove,
  showVariation = false,
  isRemovable = true,
}: SetRowProps) {
  const estimatedRM = calculateRM(weight, reps);

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-b-0">
      {/* Set Number */}
      <div className="w-8 text-center text-sm font-medium text-gray-500">
        {setNumber}
      </div>

      {/* Reps Input */}
      <div className="flex-1">
        <input
          type="number"
          value={reps}
          onChange={(e) => onRepsChange(parseInt(e.target.value) || 0)}
          min="1"
          max="100"
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          placeholder="回"
        />
      </div>

      {/* Weight Input */}
      <div className="flex-1">
        <input
          type="number"
          value={weight ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onWeightChange(val === '' ? null : parseFloat(val));
          }}
          min="0"
          max="500"
          step="0.5"
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          placeholder="kg"
        />
      </div>

      {/* Variation Input (optional) */}
      {showVariation && onVariationChange && (
        <div className="flex-1">
          <input
            type="text"
            value={variation ?? ''}
            onChange={(e) => onVariationChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="バリエーション"
            maxLength={50}
          />
        </div>
      )}

      {/* Estimated RM */}
      {estimatedRM && (
        <div className="w-16 text-right text-xs text-gray-500">
          RM {estimatedRM}
        </div>
      )}

      {/* Remove Button */}
      {isRemovable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          aria-label="セットを削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
