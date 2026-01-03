import { useState, useCallback, useEffect } from 'react';
import { AnalysisResult } from './AnalysisResult';
import { MealChat } from './MealChat';
import { PhotoCapture } from './PhotoCapture';
import { mealAnalysisApi, getPhotoUrl, api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { validateNotFuture, toDateTimeLocal, getCurrentDateTimeLocal } from '../../lib/dateValidation';
import type { FoodItem, NutritionTotals, MealRecord, MealType } from '@lifestyle-app/shared';

interface MealEditModeProps {
  meal: MealRecord;
  foodItems: FoodItem[];
  totals: NutritionTotals;
  photoUrl?: string;
  onSave: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function MealEditMode({
  meal,
  foodItems: initialFoodItems,
  totals: initialTotals,
  photoUrl,
  onSave,
  onCancel,
  onDirtyChange,
}: MealEditModeProps) {
  const toast = useToast();
  const [foodItems, setFoodItems] = useState<FoodItem[]>(initialFoodItems);
  const [totals, setTotals] = useState<NutritionTotals>(initialTotals);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(photoUrl);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  // Date/time editing state
  const [recordedAt, setRecordedAt] = useState<string>(toDateTimeLocal(meal.recordedAt));
  const [dateError, setDateError] = useState<string | null>(null);
  const [isDateSaving, setIsDateSaving] = useState(false);

  // Notify parent of dirty state changes (T040)
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleUpdateItem = useCallback(
    async (itemId: string, updates: Partial<FoodItem>) => {
      try {
        const result = await mealAnalysisApi.updateFoodItem(meal.id, itemId, updates);
        setFoodItems((prev) =>
          prev.map((item) => (item.id === itemId ? result.foodItem : item))
        );
        setTotals(result.updatedTotals);
        setIsDirty(true);
        toast.success('食材を更新しました');
      } catch (error) {
        console.error('Failed to update food item:', error);
        toast.error('食材の更新に失敗しました');
      }
    },
    [meal.id, toast]
  );

  const handleAddItem = useCallback(
    async (item: Omit<FoodItem, 'id'>) => {
      try {
        const result = await mealAnalysisApi.addFoodItem(meal.id, item);
        setFoodItems((prev) => [...prev, result.foodItem]);
        setTotals(result.updatedTotals);
        setIsDirty(true);
        toast.success('食材を追加しました');
      } catch (error) {
        console.error('Failed to add food item:', error);
        toast.error('食材の追加に失敗しました');
      }
    },
    [meal.id, toast]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      try {
        const result = await mealAnalysisApi.deleteFoodItem(meal.id, itemId);
        setFoodItems((prev) => prev.filter((item) => item.id !== itemId));
        setTotals(result.updatedTotals);
        setIsDirty(true);
        toast.success('食材を削除しました');
      } catch (error) {
        console.error('Failed to delete food item:', error);
        toast.error('食材の削除に失敗しました');
      }
    },
    [meal.id, toast]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // The food items are already saved individually via API calls
      // Just notify parent that we're done editing
      onSave();
      toast.success('変更を保存しました');
    } catch (error) {
      console.error('Failed to save meal:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, toast]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        '変更が保存されていません。編集を終了しますか？'
      );
      if (!confirmed) return;
    }
    onCancel();
  }, [isDirty, onCancel]);

  // Handler for AI chat suggestions
  const handleChatUpdate = useCallback(
    (updatedFoodItems: FoodItem[], updatedTotals: NutritionTotals, newRecordedAt?: string, newMealType?: MealType) => {
      setFoodItems(updatedFoodItems);
      setTotals(updatedTotals);
      if (newRecordedAt) {
        setRecordedAt(toDateTimeLocal(newRecordedAt));
      }
      // Notify parent about meal type change via page reload
      // The mealType is updated server-side, will be reflected on next fetch
      setIsDirty(true);
      if (newMealType) {
        toast.info(`食事タイプを${newMealType === 'breakfast' ? '朝食' : newMealType === 'lunch' ? '昼食' : newMealType === 'dinner' ? '夕食' : '間食'}に変更しました`);
      }
    },
    [toast]
  );

  // Handler for photo upload (T036)
  const handlePhotoCapture = useCallback(
    async (photo: Blob) => {
      setIsPhotoLoading(true);
      try {
        const result = await mealAnalysisApi.uploadPhoto(meal.id, photo);
        setCurrentPhotoUrl(getPhotoUrl(result.photoKey) ?? undefined);
        setShowPhotoCapture(false);
        setIsDirty(true);
        toast.success('写真をアップロードしました');
      } catch (error) {
        console.error('Failed to upload photo:', error);
        toast.error('写真のアップロードに失敗しました');
      } finally {
        setIsPhotoLoading(false);
      }
    },
    [meal.id, toast]
  );

  // Handler for photo delete (T037)
  const handlePhotoDelete = useCallback(async () => {
    const confirmed = window.confirm('本当に写真を削除しますか？');
    if (!confirmed) return;

    setIsPhotoLoading(true);
    try {
      await mealAnalysisApi.deletePhoto(meal.id);
      setCurrentPhotoUrl(undefined);
      setIsDirty(true);
      toast.success('写真を削除しました');
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('写真の削除に失敗しました');
    } finally {
      setIsPhotoLoading(false);
    }
  }, [meal.id, toast]);

  // Handler for date/time change (FR-002)
  const handleDateTimeChange = useCallback(
    async (newDateTime: string) => {
      // Validate not future (FR-005)
      const isoDateTime = new Date(newDateTime).toISOString();
      const validationError = validateNotFuture(isoDateTime);
      if (validationError) {
        setDateError(validationError);
        return;
      }
      setDateError(null);

      setIsDateSaving(true);
      try {
        await api.patch(`/api/meals/${meal.id}`, { recordedAt: isoDateTime });
        setRecordedAt(newDateTime);
        setIsDirty(true);
        toast.success('記録日時を更新しました');
      } catch (error) {
        console.error('Failed to update meal datetime:', error);
        toast.error('記録日時の更新に失敗しました');
      } finally {
        setIsDateSaving(false);
      }
    },
    [meal.id, toast]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Edit mode header */}
      <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-yellow-800">編集モード</span>
          {isDirty && (
            <span className="text-sm text-yellow-600">変更あり</span>
          )}
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            showChat
              ? 'bg-purple-600 text-white'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}
        >
          {showChat ? 'チャットを閉じる' : 'AIチャット'}
        </button>
      </div>

      {/* AI Chat section */}
      {showChat && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <MealChat
            mealId={meal.id}
            currentFoodItems={foodItems}
            onUpdate={handleChatUpdate}
          />
        </div>
      )}

      {/* Date/Time editing section (FR-002) */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">記録日時</h3>
        <div className="space-y-2">
          <input
            type="datetime-local"
            value={recordedAt}
            max={getCurrentDateTimeLocal()}
            onChange={(e) => handleDateTimeChange(e.target.value)}
            disabled={isDateSaving}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          {dateError && (
            <p className="text-sm text-red-600">{dateError}</p>
          )}
          {isDateSaving && (
            <p className="text-sm text-gray-500">更新中...</p>
          )}
        </div>
      </div>

      {/* Photo section (T038) */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">写真</h3>
        {showPhotoCapture ? (
          <PhotoCapture
            onCapture={handlePhotoCapture}
            onCancel={() => setShowPhotoCapture(false)}
          />
        ) : currentPhotoUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg">
              <img
                src={currentPhotoUrl}
                alt="食事の写真"
                className="w-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPhotoCapture(true)}
                disabled={isPhotoLoading}
                className="flex-1 rounded-lg border border-blue-300 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                写真を変更
              </button>
              <button
                onClick={handlePhotoDelete}
                disabled={isPhotoLoading}
                className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                写真を削除
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPhotoCapture(true)}
            disabled={isPhotoLoading}
            className="w-full rounded-lg border-2 border-dashed border-gray-300 py-6 text-center text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
          >
            + 写真を追加
          </button>
        )}
        {isPhotoLoading && (
          <div className="mt-2 text-center text-sm text-gray-500">処理中...</div>
        )}
      </div>

      {/* Analysis result with edit capabilities */}
      <AnalysisResult
        photoUrl={currentPhotoUrl}
        foodItems={foodItems}
        totals={totals}
        onUpdateItem={handleUpdateItem}
        onAddItem={handleAddItem}
        onDeleteItem={handleDeleteItem}
      />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存して終了'}
        </button>
      </div>
    </div>
  );
}
