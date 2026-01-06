import { useState } from 'react';
import type { FoodItem, NutritionTotals, Portion } from '@lifestyle-app/shared';

interface AnalysisResultProps {
  photoUrl?: string;
  foodItems: FoodItem[];
  totals: NutritionTotals;
  isLoading?: boolean;
  onUpdateItem?: (itemId: string, updates: Partial<FoodItem>) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onAddItem?: (item: Omit<FoodItem, 'id'>) => Promise<void>;
}

export function AnalysisResult({
  photoUrl,
  foodItems,
  totals,
  isLoading,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: AnalysisResultProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-600">AI が食事を分析中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Photo thumbnail */}
      {photoUrl && (
        <div className="flex justify-center">
          <img
            src={photoUrl}
            alt="食事の写真"
            className="max-h-48 rounded-lg object-cover"
          />
        </div>
      )}

      {/* Totals summary */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold">合計</h3>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <div className="text-lg font-bold text-blue-600">{totals.calories}</div>
            <div className="text-gray-500">kcal</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{totals.protein.toFixed(1)}</div>
            <div className="text-gray-500">P (g)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">{totals.fat.toFixed(1)}</div>
            <div className="text-gray-500">F (g)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">{totals.carbs.toFixed(1)}</div>
            <div className="text-gray-500">C (g)</div>
          </div>
        </div>
      </div>

      {/* Food items list */}
      <div className="space-y-2">
        <h3 className="font-semibold">識別された食材</h3>
        {foodItems.map((item) =>
          editingId === item.id ? (
            <FoodItemEditForm
              key={item.id}
              item={item}
              onSave={async (updates) => {
                await onUpdateItem?.(item.id, updates);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <FoodItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => onDeleteItem?.(item.id)}
              editable={!!onUpdateItem}
            />
          )
        )}
      </div>

      {/* Add food button */}
      {onAddItem && (
        <div>
          {showAddForm ? (
            <FoodItemEditForm
              onSave={async (item) => {
                await onAddItem(item as Omit<FoodItem, 'id'>);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-gray-500 hover:border-gray-400 hover:text-gray-600"
            >
              + 食材を追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FoodItemCardProps {
  item: FoodItem;
  onEdit?: () => void;
  onDelete?: () => void;
  editable?: boolean;
}

function FoodItemCard({ item, onEdit, onDelete, editable }: FoodItemCardProps) {
  const portionLabel = {
    small: '小',
    medium: '中',
    large: '大',
  }[item.portion];

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {portionLabel}
          </span>
        </div>
        <div className="mt-1 text-sm text-gray-500">
          {item.calories}kcal | P{item.protein.toFixed(1)}g F{item.fat.toFixed(1)}g C{item.carbs.toFixed(1)}g
        </div>
      </div>
      {editable && (
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

interface FoodItemEditFormProps {
  item?: FoodItem;
  onSave: (item: Partial<FoodItem>) => Promise<void>;
  onCancel: () => void;
}

function FoodItemEditForm({ item, onSave, onCancel }: FoodItemEditFormProps) {
  const [name, setName] = useState(item?.name || '');
  const [portion, setPortion] = useState<Portion>(item?.portion || 'medium');
  const [calories, setCalories] = useState(item?.calories?.toString() || '');
  const [protein, setProtein] = useState(item?.protein?.toString() || '');
  const [fat, setFat] = useState(item?.fat?.toString() || '');
  const [carbs, setCarbs] = useState(item?.carbs?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name,
        portion,
        calories: parseInt(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="食材名"
          required
          className="w-full rounded border px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={portion}
          onChange={(e) => setPortion(e.target.value as Portion)}
          className="rounded border px-3 py-2"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          required
          className="w-20 rounded border px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="P (g)"
          className="w-20 rounded border px-3 py-2"
        />
        <input
          type="number"
          step="0.1"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          placeholder="F (g)"
          className="w-20 rounded border px-3 py-2"
        />
        <input
          type="number"
          step="0.1"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="C (g)"
          className="w-20 rounded border px-3 py-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-gray-500 hover:bg-gray-100"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
