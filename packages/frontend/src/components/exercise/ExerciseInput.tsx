import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExerciseSchema, type CreateExerciseInput } from '@lifestyle-app/shared';
import { useState, useEffect } from 'react';
import { logValidationError } from '../../lib/errorLogger';

interface ExerciseInputProps {
  onSubmit: (data: CreateExerciseInput) => void;
  isLoading?: boolean;
  error?: Error | null;
}

const COMMON_EXERCISES = [
  'ランニング',
  'ウォーキング',
  'サイクリング',
  '水泳',
  '筋トレ',
  'ヨガ',
  'ストレッチ',
  'その他',
];

export function ExerciseInput({ onSubmit, isLoading, error }: ExerciseInputProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateExerciseInput>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: {
      recordedAt: new Date().toISOString(),
    },
  });

  const exerciseType = watch('exerciseType');
  const formData = watch();

  // Log validation errors when they occur
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      logValidationError('ExerciseInput', errors, formData as Record<string, unknown>);
    }
  }, [errors, formData]);

  const handleFormSubmit = (data: CreateExerciseInput) => {
    onSubmit({
      ...data,
      recordedAt: data.recordedAt || new Date().toISOString(),
    });
    reset();
    setShowCustomInput(false);
    setSuccessMessage('運動を記録しました');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExerciseTypeSelect = (type: string) => {
    if (type === 'その他') {
      setShowCustomInput(true);
      setValue('exerciseType', '');
    } else {
      setShowCustomInput(false);
      setValue('exerciseType', type);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          運動種目
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_EXERCISES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleExerciseTypeSelect(type)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                exerciseType === type || (type === 'その他' && showCustomInput)
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {showCustomInput && (
          <input
            {...register('exerciseType')}
            type="text"
            placeholder="運動種目を入力"
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        )}
        <input type="hidden" {...register('exerciseType')} />
        {errors.exerciseType && (
          <p className="mt-1 text-sm text-red-600">{errors.exerciseType.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="sets" className="block text-sm font-medium text-gray-700">
            セット数
          </label>
          <input
            {...register('sets', { valueAsNumber: true })}
            type="number"
            id="sets"
            min="1"
            max="20"
            placeholder="3"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.sets && (
            <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reps" className="block text-sm font-medium text-gray-700">
            回数
          </label>
          <input
            {...register('reps', { valueAsNumber: true })}
            type="number"
            id="reps"
            min="1"
            max="100"
            placeholder="10"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.reps && (
            <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="recordedAt" className="block text-sm font-medium text-gray-700">
            記録日時
          </label>
          <input
            {...register('recordedAt')}
            type="datetime-local"
            id="recordedAt"
            defaultValue={new Date().toISOString().slice(0, 16)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.recordedAt && (
            <p className="mt-1 text-sm text-red-600">{errors.recordedAt.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? '記録中...' : '記録する'}
        </button>

        {error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}

        {successMessage && (
          <p className="text-sm text-green-600">{successMessage}</p>
        )}
      </div>
    </form>
  );
}
