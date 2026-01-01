import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExerciseSchema, type CreateExerciseInput, type ExerciseRecord, EXERCISE_PRESETS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '@lifestyle-app/shared';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { logValidationError } from '../../lib/errorLogger';
import { LastRecordBadge } from './LastRecordBadge';

interface ExerciseTypeWithMuscleGroup {
  exerciseType: string;
  muscleGroup: string | null;
}

interface StrengthInputProps {
  onSubmit: (data: CreateExerciseInput) => void;
  isLoading?: boolean;
  error?: Error | null;
  onFetchLastRecord?: (exerciseType: string) => Promise<ExerciseRecord | null>;
  customTypes?: ExerciseTypeWithMuscleGroup[];
}

export function StrengthInput({ onSubmit, isLoading, error, onFetchLastRecord, customTypes = [] }: StrengthInputProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup>('chest');
  const [lastRecord, setLastRecord] = useState<ExerciseRecord | null>(null);
  const [isLoadingLastRecord, setIsLoadingLastRecord] = useState(false);

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
      sets: 3,
      reps: 10,
      recordedAt: new Date().toISOString().slice(0, 16),
    },
  });

  const exerciseType = watch('exerciseType');
  const formData = watch();

  // Log validation errors when they occur
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      logValidationError('StrengthInput', errors, formData as Record<string, unknown>);
    }
  }, [errors, formData]);

  const handleFormSubmit = (data: CreateExerciseInput) => {
    onSubmit({
      ...data,
      muscleGroup: selectedMuscleGroup,
      recordedAt: data.recordedAt || new Date().toISOString(),
    });
    reset({
      exerciseType: '',
      sets: 3,
      reps: 10,
      weight: undefined,
      recordedAt: new Date().toISOString().slice(0, 16),
    });
    setShowCustomInput(false);
    setSuccessMessage('運動を記録しました');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchLastRecordForType = useCallback(async (type: string) => {
    if (!onFetchLastRecord || !type) {
      setLastRecord(null);
      return;
    }
    setIsLoadingLastRecord(true);
    try {
      const record = await onFetchLastRecord(type);
      setLastRecord(record);
    } catch {
      setLastRecord(null);
    } finally {
      setIsLoadingLastRecord(false);
    }
  }, [onFetchLastRecord]);

  const handleExerciseTypeSelect = (type: string) => {
    if (type === 'その他') {
      setShowCustomInput(true);
      setValue('exerciseType', '');
      setLastRecord(null);
    } else {
      setShowCustomInput(false);
      setValue('exerciseType', type);
      fetchLastRecordForType(type);
    }
  };

  const handleCopyLastRecord = () => {
    if (lastRecord) {
      setValue('sets', lastRecord.sets);
      setValue('reps', lastRecord.reps);
      if (lastRecord.weight !== null) {
        setValue('weight', lastRecord.weight);
      }
    }
  };

  const filteredPresets = EXERCISE_PRESETS.filter(
    (preset) => preset.muscleGroup === selectedMuscleGroup
  );

  // Filter out preset names and filter by selected muscle group
  const recentCustomTypes = useMemo(() => {
    const presetNames = new Set(EXERCISE_PRESETS.map(p => p.name));
    return customTypes
      .filter(item => !presetNames.has(item.exerciseType))
      .filter(item => item.muscleGroup === selectedMuscleGroup)
      .map(item => item.exerciseType);
  }, [customTypes, selectedMuscleGroup]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Muscle Group Tabs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          部位
        </label>
        <div className="flex flex-wrap gap-1">
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedMuscleGroup(group)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                selectedMuscleGroup === group
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {MUSCLE_GROUP_LABELS[group]}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          種目
        </label>
        <div className="flex flex-wrap gap-2">
          {filteredPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleExerciseTypeSelect(preset.name)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                exerciseType === preset.name
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleExerciseTypeSelect('その他')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              showCustomInput
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            その他
          </button>
        </div>

        {/* Recent Custom Types */}
        {recentCustomTypes.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              最近使用した種目
            </label>
            <div className="flex flex-wrap gap-2">
              {recentCustomTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleExerciseTypeSelect(type)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    exerciseType === type
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
        {showCustomInput ? (
          <input
            {...register('exerciseType')}
            type="text"
            placeholder="種目名を入力"
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        ) : (
          <input type="hidden" {...register('exerciseType')} />
        )}
        {errors.exerciseType && (
          <p className="mt-1 text-sm text-red-600">{errors.exerciseType.message}</p>
        )}

        {/* Last Record Badge */}
        {exerciseType && !showCustomInput && (
          <div className="mt-3">
            <LastRecordBadge
              record={lastRecord}
              onCopy={handleCopyLastRecord}
              isLoading={isLoadingLastRecord}
            />
          </div>
        )}
      </div>

      {/* Sets, Reps, Weight */}
      <div className="grid gap-4 grid-cols-3">
        <div>
          <label htmlFor="sets" className="block text-sm font-medium text-gray-700">
            セット
          </label>
          <input
            {...register('sets', { valueAsNumber: true })}
            type="number"
            id="sets"
            min="1"
            max="20"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.sets && (
            <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reps" className="block text-sm font-medium text-gray-700">
            レップ
          </label>
          <input
            {...register('reps', { valueAsNumber: true })}
            type="number"
            id="reps"
            min="1"
            max="100"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.reps && (
            <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
            重量 (kg)
          </label>
          <input
            {...register('weight', {
              setValueAs: (v) => {
                if (v === '' || v === undefined || v === null) return null;
                const num = Number(v);
                return isNaN(num) ? null : num;
              }
            })}
            type="number"
            id="weight"
            min="0"
            max="500"
            step="0.5"
            placeholder="自重"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
          )}
        </div>
      </div>

      {/* Recorded At */}
      <div>
        <label htmlFor="recordedAt" className="block text-sm font-medium text-gray-700">
          記録日時
        </label>
        <input
          {...register('recordedAt')}
          type="datetime-local"
          id="recordedAt"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        {errors.recordedAt && (
          <p className="mt-1 text-sm text-red-600">{errors.recordedAt.message}</p>
        )}
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
