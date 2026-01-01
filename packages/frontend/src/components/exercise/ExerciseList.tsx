import { useState } from 'react';
import type { ExerciseRecord, UpdateExerciseInput } from '@lifestyle-app/shared';

interface ExerciseListProps {
  exercises: ExerciseRecord[];
  onUpdate: (params: { id: string; input: UpdateExerciseInput }) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function ExerciseList({
  exercises,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: ExerciseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>('');
  const [editSets, setEditSets] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (exercise: ExerciseRecord) => {
    setEditingId(exercise.id);
    setEditType(exercise.exerciseType);
    setEditSets(exercise.sets);
    setEditReps(exercise.reps);
    setEditWeight(exercise.weight);
  };

  const handleSave = (id: string) => {
    onUpdate({
      id,
      input: {
        exerciseType: editType,
        sets: editSets,
        reps: editReps,
        weight: editWeight,
      },
    });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const formatExercise = (exercise: ExerciseRecord) => {
    const weightStr = exercise.weight ? ` ${exercise.weight}kg` : '';
    return `${exercise.sets}×${exercise.reps}${weightStr}`;
  };

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">まだ運動の記録がありません</p>
      </div>
    );
  }

  // Group exercises by date
  const groupedExercises = exercises.reduce(
    (groups, exercise) => {
      const date = new Date(exercise.recordedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(exercise);
      return groups;
    },
    {} as Record<string, ExerciseRecord[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedExercises).map(([date, dateExercises]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-gray-500">{date}</h3>
          <div className="space-y-3">
            {dateExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                {deleteConfirmId === exercise.id ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">この記録を削除しますか？</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        disabled={isDeleting}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        削除する
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : editingId === exercise.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="種目名"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editSets}
                          onChange={(e) => setEditSets(parseInt(e.target.value) || 0)}
                          min="1"
                          max="20"
                          className="w-16 rounded border border-gray-300 px-3 py-2"
                        />
                        <span className="text-gray-500">×</span>
                        <input
                          type="number"
                          value={editReps}
                          onChange={(e) => setEditReps(parseInt(e.target.value) || 0)}
                          min="1"
                          max="100"
                          className="w-16 rounded border border-gray-300 px-3 py-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editWeight ?? ''}
                          onChange={(e) => setEditWeight(e.target.value ? parseFloat(e.target.value) : null)}
                          min="0"
                          step="0.5"
                          placeholder="自重"
                          className="w-20 rounded border border-gray-300 px-3 py-2"
                        />
                        <span className="text-gray-500">kg</span>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleSave(exercise.id)}
                          disabled={isUpdating}
                          className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                        {exercise.exerciseType}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatExercise(exercise)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(exercise.recordedAt).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(exercise)}
                        className="text-sm text-orange-600 hover:text-orange-800"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(exercise.id)}
                        className="text-sm text-red-600 hover:text-red-800"
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
  );
}
