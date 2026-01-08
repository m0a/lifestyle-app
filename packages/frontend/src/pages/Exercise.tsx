import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExercises } from '../hooks/useExercises';
import { StrengthInput } from '../components/exercise/StrengthInput';
import { ExerciseList } from '../components/exercise/ExerciseList';
import { ExerciseSummary } from '../components/exercise/ExerciseSummary';
import { ExerciseImportDialog } from '../components/exercise/ExerciseImportDialog';
import type { ExerciseImportSummary, RecentExerciseItem } from '@lifestyle-app/shared';
import { api } from '../lib/client';

export function Exercise() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('');
  const [allExerciseTypes, setAllExerciseTypes] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    date: string;
    exercises: Array<{
      exerciseType: string;
      muscleGroup: string | null;
      sets: Array<{
        setNumber: number;
        reps: number;
        weight: number | null;
        variation: string | null;
      }>;
    }>;
  } | null>(null);

  // Get today's date for the image generation link
  const today = new Date().toISOString().split('T')[0];

  const {
    exercises,
    weeklySummary,
    exerciseTypes,
    isLoading,
    error,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    fetchLastRecord,
  } = useExercises({ exerciseType: filterType || undefined });

  // Update available exercise types when exercises change (without filter)
  useEffect(() => {
    if (!filterType && exercises.length > 0) {
      const types = [...new Set(exercises.map((e) => e.exerciseType))].sort();
      setAllExerciseTypes(types);
    }
  }, [exercises, filterType]);

  // Clear pendingImport after it's been processed
  useEffect(() => {
    if (pendingImport) {
      // Reset after a short delay to allow StrengthInput to process it
      const timer = setTimeout(() => {
        setPendingImport(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingImport]);

  const handleImportExercise = async (exercise: ExerciseImportSummary) => {
    // Fetch detailed exercise records for the selected exercise
    // This gets all sets from the same exercise session
    try {
      const res = await api.exercises.$get({
        query: {
          startDate: exercise.recordedAt,
          endDate: exercise.recordedAt,
          exerciseType: exercise.exerciseType,
        },
      });

      if (!res.ok) {
        console.error('Failed to fetch exercise details');
        return;
      }

      const data = await res.json();
      const records = data.exercises;

      // Filter records that match the exact timestamp
      const matchingRecords = records.filter(
        (r: typeof records[0]) => r.recordedAt === exercise.recordedAt
      );

      if (matchingRecords.length === 0) {
        console.error('No matching exercise records found');
        return;
      }

      // Sort by setNumber and prepare session data
      const sortedRecords = matchingRecords.sort(
        (a: typeof records[0], b: typeof records[0]) => a.setNumber - b.setNumber
      );

      // Create a session object compatible with StrengthInput's handleSessionSelect
      const session = {
        date: exercise.recordedAt.split('T')[0] ?? '',
        exercises: [{
          exerciseType: exercise.exerciseType,
          muscleGroup: exercise.muscleGroup,
          sets: sortedRecords.map((r: typeof records[0]) => ({
            setNumber: r.setNumber,
            reps: r.reps,
            weight: r.weight,
            variation: r.variation,
          })),
        }],
      };

      // Pass the session data to StrengthInput via pendingImport
      setPendingImport(session);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing exercise:', error);
    }
  };

  const handleRecentImport = async (exercise: RecentExerciseItem) => {
    // Fetch detailed exercise records for the recent exercise
    try {
      // Query exercises for the full day
      const startDate = `${exercise.lastPerformedDate}T00:00:00.000Z`;
      const endDate = `${exercise.lastPerformedDate}T23:59:59.999Z`;

      const res = await api.exercises.$get({
        query: {
          startDate,
          endDate,
          exerciseType: exercise.exerciseType,
        },
      });

      if (!res.ok) {
        console.error('Failed to fetch exercise details');
        return;
      }

      const data = await res.json();
      const records = data.exercises;

      if (records.length === 0) {
        console.error('No matching exercise records found');
        return;
      }

      // Find the most recent session (by recordedAt) for this exercise type
      const recordedAtTimes = [...new Set(records.map((r: typeof records[0]) => r.recordedAt))];
      const latestRecordedAt = recordedAtTimes.sort().reverse()[0];

      // Filter records for the latest session
      const sessionRecords = records.filter(
        (r: typeof records[0]) => r.recordedAt === latestRecordedAt
      );

      // Sort by setNumber and prepare session data
      const sortedRecords = sessionRecords.sort(
        (a: typeof records[0], b: typeof records[0]) => a.setNumber - b.setNumber
      );

      const session = {
        date: exercise.lastPerformedDate,
        exercises: [{
          exerciseType: exercise.exerciseType,
          muscleGroup: exercise.muscleGroup,
          sets: sortedRecords.map((r: typeof records[0]) => ({
            setNumber: r.setNumber,
            reps: r.reps,
            weight: r.weight,
            variation: r.variation,
          })),
        }],
      };

      setPendingImport(session);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing recent exercise:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">運動記録</h1>
        <p className="mt-1 text-gray-600">日々の筋トレを記録して、健康的な習慣を身につけましょう</p>
      </div>

      {/* Weekly Summary */}
      {weeklySummary && (
        <ExerciseSummary
          totalSets={weeklySummary.totalSets}
          totalReps={weeklySummary.totalReps}
          count={weeklySummary.count}
          byType={weeklySummary.byType}
        />
      )}

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">筋トレを記録</h2>
        <StrengthInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
          onFetchLastRecord={fetchLastRecord}
          customTypes={exerciseTypes}
          pendingImport={pendingImport}
        />
      </div>

      {/* History List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">記録履歴</h2>
            <button
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              過去から取り込み
            </button>
            <button
              onClick={() => navigate(`/exercises/image?date=${today}`)}
              className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              共有
            </button>
          </div>
          {allExerciseTypes.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">すべての種目</option>
              {allExerciseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>
        <ExerciseList
          exercises={exercises}
          onUpdate={update}
          onDelete={remove}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      </div>

      {/* Exercise Import Dialog */}
      <ExerciseImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSelect={handleImportExercise}
        onSelectRecent={handleRecentImport}
      />
    </div>
  );
}
