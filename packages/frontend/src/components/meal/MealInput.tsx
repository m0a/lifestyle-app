import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMealSchema, type CreateMealInput } from '@lifestyle-app/shared';
import { useState } from 'react';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

interface MealInputProps {
  onSubmit: (data: CreateMealInput) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function MealInput({ onSubmit, isLoading, error }: MealInputProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMealInput>({
    resolver: zodResolver(createMealSchema),
    defaultValues: {
      mealType: 'breakfast',
      recordedAt: new Date().toISOString(),
    },
  });

  const handleFormSubmit = (data: CreateMealInput) => {
    onSubmit({
      ...data,
      recordedAt: data.recordedAt || new Date().toISOString(),
      calories: data.calories || undefined,
    });
    reset();
    setSuccessMessage('食事を記録しました');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="mealType" className="block text-sm font-medium text-gray-700">
            食事タイプ
          </label>
          <select
            {...register('mealType')}
            id="mealType"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.mealType && (
            <p className="mt-1 text-sm text-red-600">{errors.mealType.message}</p>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            食事内容
          </label>
          <input
            {...register('content')}
            type="text"
            id="content"
            placeholder="例: 卵かけご飯と味噌汁"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
            カロリー (kcal、任意)
          </label>
          <input
            {...register('calories', { valueAsNumber: true })}
            type="number"
            id="calories"
            min="0"
            max="10000"
            placeholder="350"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.calories && (
            <p className="mt-1 text-sm text-red-600">{errors.calories.message}</p>
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
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
