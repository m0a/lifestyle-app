import { useState, useCallback, useMemo, useEffect } from 'react';
import { EXERCISE_PRESETS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup, type ExerciseRecord } from '@lifestyle-app/shared';
import { SetRow } from './SetRow';
import { LastRecordBadge } from './LastRecordBadge';
import { SessionListModal } from './SessionListModal';
import { logValidationError } from '../../lib/errorLogger';

interface SetInput {
  reps: number;
  weight: number | null;
  variation?: string;
}

interface CreateExerciseSetsInput {
  exerciseType: string;
  muscleGroup?: MuscleGroup;
  sets: SetInput[];
  recordedAt: string;
}

interface ExerciseTypeWithMuscleGroup {
  exerciseType: string;
  muscleGroup: string | null;
}

interface StrengthInputProps {
  onSubmit: (data: CreateExerciseSetsInput) => void;
  isLoading?: boolean;
  error?: Error | null;
  onFetchLastRecord?: (exerciseType: string) => Promise<ExerciseRecord | null>;
  onFetchLastSession?: (exerciseType: string) => Promise<ExerciseRecord[]>;
  customTypes?: ExerciseTypeWithMuscleGroup[];
  pendingImport?: Session | null;
}

interface SessionExercise {
  exerciseType: string;
  muscleGroup: string | null;
  sets: {
    setNumber: number;
    reps: number;
    weight: number | null;
    variation: string | null;
  }[];
}

interface Session {
  date: string;
  exercises: SessionExercise[];
}

export function StrengthInput({ onSubmit, isLoading, error, onFetchLastRecord, onFetchLastSession, customTypes = [], pendingImport }: StrengthInputProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup>('chest');
  const [lastRecord, setLastRecord] = useState<ExerciseRecord | null>(null);
  const [lastSession, setLastSession] = useState<ExerciseRecord[]>([]);
  const [isLoadingLastRecord, setIsLoadingLastRecord] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Form state
  const [exerciseType, setExerciseType] = useState('');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [sets, setSets] = useState<SetInput[]>([{ reps: 10, weight: null }]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const actualExerciseType = showCustomInput ? customExerciseName : exerciseType;

  const fetchLastRecordForType = useCallback(async (type: string) => {
    if (!type) {
      setLastRecord(null);
      setLastSession([]);
      return;
    }
    setIsLoadingLastRecord(true);
    try {
      // Fetch last session (all sets) if available, otherwise fall back to single record
      if (onFetchLastSession) {
        const session = await onFetchLastSession(type);
        setLastSession(session);
        setLastRecord(session[0] || null);
      } else if (onFetchLastRecord) {
        const record = await onFetchLastRecord(type);
        setLastRecord(record);
        setLastSession(record ? [record] : []);
      } else {
        setLastRecord(null);
        setLastSession([]);
      }
    } catch {
      setLastRecord(null);
      setLastSession([]);
    } finally {
      setIsLoadingLastRecord(false);
    }
  }, [onFetchLastRecord, onFetchLastSession]);

  const handleExerciseTypeSelect = (type: string) => {
    if (type === 'その他') {
      setShowCustomInput(true);
      setExerciseType('');
      setLastRecord(null);
    } else {
      setShowCustomInput(false);
      setExerciseType(type);
      fetchLastRecordForType(type);
    }
  };

  const handleCopyLastRecord = () => {
    if (lastSession.length > 0) {
      // Copy all sets from the last session
      const newSets: SetInput[] = lastSession.map((record) => ({
        reps: record.reps,
        weight: record.weight,
        variation: record.variation || undefined,
      }));
      setSets(newSets);
    } else if (lastRecord) {
      // Fallback: copy single record to first set
      const newSets = [...sets];
      if (newSets.length > 0) {
        newSets[0] = {
          reps: lastRecord.reps,
          weight: lastRecord.weight,
        };
        setSets(newSets);
      }
    }
  };

  const addSet = () => {
    // Copy values from the last set
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { reps: lastSet?.reps || 10, weight: lastSet?.weight || null }]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof SetInput, value: number | string | null) => {
    const newSets = [...sets];
    const set = newSets[index];
    if (!set) return;
    if (field === 'reps') {
      set.reps = value as number;
    } else if (field === 'weight') {
      set.weight = value as number | null;
    } else if (field === 'variation') {
      set.variation = value as string;
    }
    setSets(newSets);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (!actualExerciseType) {
      setValidationError('種目を選択してください');
      return;
    }

    if (sets.length === 0) {
      setValidationError('1セット以上入力してください');
      return;
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (!set) continue;
      if (set.reps < 1 || set.reps > 100) {
        setValidationError(`セット${i + 1}: 回数は1〜100の範囲で入力してください`);
        logValidationError('StrengthInput', { reps: { message: 'Invalid reps', type: 'validate' } }, { setIndex: i, reps: set.reps });
        return;
      }
    }

    onSubmit({
      exerciseType: actualExerciseType,
      muscleGroup: selectedMuscleGroup,
      sets: sets.map(s => ({
        reps: s.reps,
        weight: s.weight,
        variation: s.variation,
      })),
      recordedAt: new Date().toISOString(),
    });

    // Reset form
    setExerciseType('');
    setCustomExerciseName('');
    setSets([{ reps: 10, weight: null }]);
    setShowCustomInput(false);
    setSuccessMessage('運動を記録しました');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const filteredPresets = EXERCISE_PRESETS.filter(
    (preset) => preset.muscleGroup === selectedMuscleGroup
  );

  const recentCustomTypes = useMemo(() => {
    const presetNames = new Set(EXERCISE_PRESETS.map(p => p.name));
    return customTypes
      .filter(item => !presetNames.has(item.exerciseType))
      .filter(item => item.muscleGroup === selectedMuscleGroup)
      .map(item => item.exerciseType);
  }, [customTypes, selectedMuscleGroup]);

  const handleSessionSelect = useCallback((session: Session) => {
    // Take the first exercise from the session and populate the form
    const firstExercise = session.exercises[0];
    if (!firstExercise) return;

    // Set exercise type
    const isPreset = EXERCISE_PRESETS.some(p => p.name === firstExercise.exerciseType);
    if (isPreset) {
      setExerciseType(firstExercise.exerciseType);
      setShowCustomInput(false);
    } else {
      setCustomExerciseName(firstExercise.exerciseType);
      setShowCustomInput(true);
    }

    // Set muscle group if available
    if (firstExercise.muscleGroup) {
      setSelectedMuscleGroup(firstExercise.muscleGroup as MuscleGroup);
    }

    // Copy sets
    setSets(firstExercise.sets.map(s => ({
      reps: s.reps,
      weight: s.weight,
      variation: s.variation || undefined,
    })));

    setSuccessMessage(`「${firstExercise.exerciseType}」のセット構成を取り込みました`);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // Handle external import requests
  useEffect(() => {
    if (pendingImport) {
      handleSessionSelect(pendingImport);
    }
  }, [pendingImport, handleSessionSelect]);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
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
                exerciseType === preset.name && !showCustomInput
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
                    exerciseType === type && !showCustomInput
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

        {showCustomInput && (
          <input
            type="text"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            placeholder="種目名を入力"
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        )}

        {/* Last Record Badge */}
        {actualExerciseType && !showCustomInput && (
          <div className="mt-3">
            <LastRecordBadge
              record={lastRecord}
              sessionCount={lastSession.length}
              onCopy={handleCopyLastRecord}
              isLoading={isLoadingLastRecord}
            />
          </div>
        )}
      </div>

      {/* Sets Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            セット
          </label>
          <button
            type="button"
            onClick={addSet}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + セット追加
          </button>
        </div>

        {/* Set Headers */}
        <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
          <div className="w-8 text-center">#</div>
          <div className="flex-1">回数</div>
          <div className="flex-1">重量(kg)</div>
          <div className="w-16"></div>
          <div className="w-6"></div>
        </div>

        {/* Set Rows */}
        <div className="bg-gray-50 rounded-lg p-2">
          {sets.map((set, index) => (
            <SetRow
              key={index}
              setNumber={index + 1}
              reps={set.reps}
              weight={set.weight}
              variation={set.variation}
              onRepsChange={(reps) => updateSet(index, 'reps', reps)}
              onWeightChange={(weight) => updateSet(index, 'weight', weight)}
              onRemove={() => removeSet(index)}
              isRemovable={sets.length > 1}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? '記録中...' : '記録する'}
        </button>

        <button
          type="button"
          onClick={() => setShowSessionModal(true)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          過去のトレーニングから取り込む
        </button>

        {(error || validationError) && (
          <p className="text-sm text-red-600">{error?.message || validationError}</p>
        )}

        {successMessage && (
          <p className="text-sm text-green-600">{successMessage}</p>
        )}
      </div>

      {/* Session Import Modal */}
      <SessionListModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSelect={handleSessionSelect}
      />
    </form>
  );
}
