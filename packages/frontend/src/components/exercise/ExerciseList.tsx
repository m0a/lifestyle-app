import { useState, useMemo } from 'react';
import type { ExerciseRecord, UpdateExerciseInput } from '@lifestyle-app/shared';
import { calculateRM } from '../../lib/exercise-utils';

interface ExerciseListProps {
  exercises: ExerciseRecord[];
  onUpdate: (params: { id: string; input: UpdateExerciseInput }) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

interface GroupedExercise {
  exerciseType: string;
  muscleGroup: string | null;
  date: string;
  dateLabel: string;
  timeLabel: string;
  sets: ExerciseRecord[];
}

export function ExerciseList({
  exercises,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: ExerciseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReps, setEditReps] = useState<number>(0);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [editVariation, setEditVariation] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group exercises by exerciseType and date
  const groupedExercises = useMemo(() => {
    const groups: GroupedExercise[] = [];
    const groupMap = new Map<string, GroupedExercise>();

    for (const exercise of exercises) {
      const date = new Date(exercise.recordedAt);
      const dateStr = date.toISOString().split('T')[0] ?? '';
      const key = `${exercise.exerciseType}|${dateStr}`;

      if (!groupMap.has(key)) {
        const group: GroupedExercise = {
          exerciseType: exercise.exerciseType,
          muscleGroup: exercise.muscleGroup,
          date: dateStr,
          dateLabel: date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          timeLabel: date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          sets: [],
        };
        groupMap.set(key, group);
        groups.push(group);
      }

      groupMap.get(key)!.sets.push(exercise);
    }

    // Sort sets within each group by setNumber
    for (const group of groups) {
      group.sets.sort((a, b) => a.setNumber - b.setNumber);
    }

    return groups;
  }, [exercises]);

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const dateGroups: Record<string, GroupedExercise[]> = {};

    for (const group of groupedExercises) {
      if (!dateGroups[group.dateLabel]) {
        dateGroups[group.dateLabel] = [];
      }
      dateGroups[group.dateLabel]!.push(group);
    }

    return dateGroups;
  }, [groupedExercises]);

  const handleEdit = (exercise: ExerciseRecord) => {
    setEditingId(exercise.id);
    setEditReps(exercise.reps);
    setEditWeight(exercise.weight);
    setEditVariation(exercise.variation || '');
  };

  const handleSave = (id: string) => {
    onUpdate({
      id,
      input: {
        reps: editReps,
        weight: editWeight,
        variation: editVariation || null,
      },
    });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">まだ運動の記録がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateLabel, dateGroups]) => (
        <div key={dateLabel}>
          <h3 className="mb-3 text-sm font-medium text-gray-500">{dateLabel}</h3>
          <div className="space-y-3">
            {dateGroups.map((group) => (
              <div
                key={`${group.exerciseType}-${group.date}`}
                className="rounded-lg border border-gray-200 bg-white overflow-hidden"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                      {group.exerciseType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {group.sets.length}セット
                    </span>
                    <span className="text-xs text-gray-400">
                      {group.timeLabel}
                    </span>
                  </div>
                </div>

                {/* Set Rows */}
                <div className="divide-y divide-gray-100">
                  {/* Header Row */}
                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 bg-gray-50">
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1">回数</div>
                    <div className="flex-1">重量(kg)</div>
                    <div className="w-16 text-right">RM</div>
                    <div className="w-20"></div>
                  </div>

                  {group.sets.map((exercise) => (
                    <div key={exercise.id} className="px-4 py-2">
                      {deleteConfirmId === exercise.id ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">このセットを削除しますか？</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(exercise.id)}
                              disabled={isDeleting}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              削除
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : editingId === exercise.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 text-center text-sm font-medium text-gray-500">
                            {exercise.setNumber}
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              value={editReps}
                              onChange={(e) => setEditReps(parseInt(e.target.value) || 0)}
                              min="1"
                              max="100"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              value={editWeight ?? ''}
                              onChange={(e) => setEditWeight(e.target.value ? parseFloat(e.target.value) : null)}
                              min="0"
                              step="0.5"
                              placeholder="自重"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="w-16"></div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSave(exercise.id)}
                              disabled={isUpdating}
                              className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 text-center text-sm font-medium text-gray-500">
                            {exercise.setNumber}
                          </div>
                          <div className="flex-1 text-sm">
                            {exercise.reps}回
                            {exercise.variation && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({exercise.variation})
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-sm">
                            {exercise.weight !== null ? `${exercise.weight}kg` : '自重'}
                          </div>
                          <div className="w-16 text-right text-xs text-gray-500">
                            {calculateRM(exercise.weight, exercise.reps) ? (
                              <span>{calculateRM(exercise.weight, exercise.reps)}</span>
                            ) : (
                              '-'
                            )}
                          </div>
                          <div className="w-20 flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(exercise)}
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(exercise.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
