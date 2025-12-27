import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWeightSchema, type CreateWeightInput } from '@lifestyle-app/shared';
import { useState } from 'react';

interface WeightInputProps {
  onSubmit: (data: CreateWeightInput) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function WeightInput({ onSubmit, isLoading, error }: WeightInputProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWeightInput>({
    resolver: zodResolver(createWeightSchema),
    defaultValues: {
      recordedAt: new Date().toISOString(),
    },
  });

  const handleFormSubmit = (data: CreateWeightInput) => {
    onSubmit({
      ...data,
      recordedAt: data.recordedAt || new Date().toISOString(),
    });
    reset();
    setSuccessMessage('体重を記録しました');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
            体重 (kg)
          </label>
          <input
            {...register('weight', { valueAsNumber: true })}
            type="number"
            id="weight"
            step="0.1"
            min="20"
            max="300"
            placeholder="70.0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
          )}
        </div>

        <div className="flex-1">
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

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? '記録中...' : '記録する'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}
    </form>
  );
}
