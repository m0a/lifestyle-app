import { useState } from 'react';
import type { WeightRecord, UpdateWeightInput } from '@lifestyle-app/shared';

interface WeightListProps {
  weights: WeightRecord[];
  onUpdate: (params: { id: string; input: UpdateWeightInput }) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function WeightList({
  weights,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: WeightListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (weight: WeightRecord) => {
    setEditingId(weight.id);
    setEditWeight(weight.weight);
  };

  const handleSave = (id: string) => {
    onUpdate({ id, input: { weight: editWeight } });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  if (weights.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">まだ体重の記録がありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              日時
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              体重
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {weights.map((weight) => (
            <tr key={weight.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                {new Date(weight.recordedAt).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                {editingId === weight.id ? (
                  <input
                    type="number"
                    value={editWeight}
                    onChange={(e) => setEditWeight(parseFloat(e.target.value))}
                    step="0.1"
                    min="20"
                    max="300"
                    className="w-24 rounded border border-gray-300 px-2 py-1"
                  />
                ) : (
                  <span className="font-medium">{weight.weight.toFixed(1)} kg</span>
                )}
              </td>
              <td className="px-4 py-4 text-right text-sm">
                {deleteConfirmId === weight.id ? (
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-gray-600 text-xs">削除しますか？</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(weight.id)}
                        disabled={isDeleting}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        確認
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : editingId === weight.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleSave(weight.id)}
                      disabled={isUpdating}
                      className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(weight)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(weight.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
