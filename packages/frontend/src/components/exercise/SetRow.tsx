import { calculateRM } from '../../lib/exercise-utils';

interface SetRowProps {
  setNumber: number;
  reps: number;
  weight: number | null;
  variation?: string | null;
  memo?: string;
  onRepsChange: (reps: number) => void;
  onWeightChange: (weight: number | null) => void;
  onVariationChange?: (variation: string) => void;
  onMemoChange?: (memo: string) => void;
  onRemove?: () => void;
  showVariation?: boolean;
  isRemovable?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  variation,
  memo,
  onRepsChange,
  onWeightChange,
  onVariationChange,
  onMemoChange,
  onRemove,
  showVariation = false,
  isRemovable = true,
  isActive = false,
  onActivate,
}: SetRowProps) {
  const estimatedRM = calculateRM(weight, reps);

  return (
    <div
      className={`py-2 pr-1 border-b border-gray-100 last:border-b-0 border-l-4 transition-colors ${
        isActive
          ? 'border-l-orange-500 bg-orange-50 rounded-r-md'
          : 'border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Set Number */}
        <div className="w-8 flex justify-center">
          <button
            type="button"
            onClick={onActivate}
            aria-pressed={isActive}
            aria-label={`セット${setNumber}を実行中にする`}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-orange-600 text-white'
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            {setNumber}
          </button>
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

      {/* Memo Input */}
      {onMemoChange && (
        <div className="ml-8 mt-1">
          <input
            type="text"
            value={memo ?? ''}
            onChange={(e) => onMemoChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="メモ"
            maxLength={200}
          />
        </div>
      )}
    </div>
  );
}
