import { useState, useCallback, useEffect } from 'react';
import { AnalysisResult } from './AnalysisResult';
import { MealChat } from './MealChat';
import { PhotoUploadButton } from './PhotoUploadButton';
import { mealAnalysisApi, api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { validateNotFuture, toDateTimeLocal, getCurrentDateTimeLocal } from '../../lib/dateValidation';
import { useMealPhotos } from '../../hooks/useMealPhotos';
import type { FoodItem, NutritionTotals, MealRecord, MealType } from '@lifestyle-app/shared';

interface MealEditModeProps {
  meal: MealRecord;
  foodItems: FoodItem[];
  totals: NutritionTotals;
  onSave: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function MealEditMode({
  meal,
  foodItems: initialFoodItems,
  totals: initialTotals,
  onSave,
  onCancel,
  onDirtyChange,
}: MealEditModeProps) {
  const toast = useToast();
  const [foodItems, setFoodItems] = useState<FoodItem[]>(initialFoodItems);
  const [totals, setTotals] = useState<NutritionTotals>(initialTotals);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // Date/time editing state
  const [recordedAt, setRecordedAt] = useState<string>(toDateTimeLocal(meal.recordedAt));
  const [dateError, setDateError] = useState<string | null>(null);
  const [isDateSaving, setIsDateSaving] = useState(false);
  // Meal type editing state
  const [mealType, setMealType] = useState<MealType>(meal.mealType);
  const [isMealTypeSaving, setIsMealTypeSaving] = useState(false);

  // Multiple photos support (User Story 1)
  const {
    photos,
    totals: photoTotals,
    isLoading: isPhotosLoading,
    upload,
    remove: removePhoto,
    isUploading,
    isDeleting,
    uploadError,
    deleteError,
  } = useMealPhotos(meal.id);

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
      if (newMealType) {
        setMealType(newMealType);
        toast.info(`食事タイプを${newMealType === 'breakfast' ? '朝食' : newMealType === 'lunch' ? '昼食' : newMealType === 'dinner' ? '夕食' : '間食'}に変更しました`);
      }
      setIsDirty(true);
    },
    [toast]
  );

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

  // Handler for meal type change
  const handleMealTypeChange = useCallback(
    async (newMealType: MealType) => {
      if (newMealType === mealType) return;

      setIsMealTypeSaving(true);
      try {
        await api.patch(`/api/meals/${meal.id}`, { mealType: newMealType });
        setMealType(newMealType);
        setIsDirty(true);
        toast.success('食事タイプを更新しました');
      } catch (error) {
        console.error('Failed to update meal type:', error);
        toast.error('食事タイプの更新に失敗しました');
      } finally {
        setIsMealTypeSaving(false);
      }
    },
    [meal.id, mealType, toast]
  );

  // Handler for multiple photo upload (T028)
  const handlePhotoUpload = useCallback(
    async (file: File) => {
      try {
        upload(file);
        setIsDirty(true);
        toast.success('写真をアップロードしました');
      } catch (error) {
        console.error('Failed to upload photo:', error);
        toast.error('写真のアップロードに失敗しました');
      }
    },
    [upload, toast]
  );

  // Handler for photo deletion (T029)
  const handlePhotoRemove = useCallback(
    async (photoId: string) => {
      const confirmed = window.confirm('本当にこの写真を削除しますか？');
      if (!confirmed) return;

      try {
        removePhoto(photoId);
        setIsDirty(true);
        toast.success('写真を削除しました');
      } catch (error) {
        console.error('Failed to delete photo:', error);
        toast.error('写真の削除に失敗しました');
      }
    },
    [removePhoto, toast]
  );

  // Show upload/delete errors
  useEffect(() => {
    if (uploadError) {
      toast.error(uploadError.message);
    }
    if (deleteError) {
      toast.error(deleteError.message);
    }
  }, [uploadError, deleteError, toast]);

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

      {/* Meal type editing section */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">食事タイプ</h3>
        <div className="space-y-2">
          <select
            value={mealType}
            onChange={(e) => handleMealTypeChange(e.target.value as MealType)}
            disabled={isMealTypeSaving}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="breakfast">朝食</option>
            <option value="lunch">昼食</option>
            <option value="dinner">夕食</option>
            <option value="snack">間食</option>
          </select>
          {isMealTypeSaving && (
            <p className="text-sm text-gray-500">更新中...</p>
          )}
        </div>
      </div>

      {/* Multiple Photos section (T027-T030) */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">写真</h3>
          {photoTotals && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{photoTotals.photoCount}枚</span>
              {photoTotals.analyzedPhotoCount < photoTotals.photoCount && (
                <span className="ml-2 text-yellow-600">
                  (分析中: {photoTotals.photoCount - photoTotals.analyzedPhotoCount}枚)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Photo grid (T027) */}
        {isPhotosLoading ? (
          <div className="py-8 text-center text-gray-500">読み込み中...</div>
        ) : photos.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <img
                    src={photo.photoUrl}
                    alt="食事の写真"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  {/* Analysis status badge */}
                  <div className="absolute left-2 top-2 rounded bg-black bg-opacity-60 px-2 py-0.5 text-xs text-white">
                    {photo.analysisStatus === 'complete' && '✓ 分析済'}
                    {photo.analysisStatus === 'analyzing' && '⏳ 分析中'}
                    {photo.analysisStatus === 'pending' && '⏳ 待機中'}
                    {photo.analysisStatus === 'failed' && '⚠ 失敗'}
                  </div>
                  {/* Delete button (T029) */}
                  <button
                    onClick={() => handlePhotoRemove(photo.id)}
                    disabled={isDeleting || photos.length === 1}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title={photos.length === 1 ? '最後の写真は削除できません' : '写真を削除'}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {/* Nutrition info tooltip on hover */}
                  {photo.analysisStatus === 'complete' && (
                    <div className="absolute bottom-2 left-2 right-2 rounded bg-black bg-opacity-75 p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex justify-between">
                        <span>{photo.calories} kcal</span>
                        <span>P:{photo.protein}g F:{photo.fat}g C:{photo.carbs}g</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Photo totals display (T030) */}
            {photoTotals && photoTotals.analyzedPhotoCount > 0 && (
              <div className="rounded-lg bg-blue-50 p-3">
                <h4 className="mb-2 text-sm font-semibold text-blue-900">写真の栄養合計</h4>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-gray-600">カロリー:</span>
                    <span className="ml-1 font-medium text-blue-900">
                      {photoTotals.calories.toLocaleString()} kcal
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">タンパク質:</span>
                    <span className="ml-1 font-medium text-blue-900">{photoTotals.protein}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">脂質:</span>
                    <span className="ml-1 font-medium text-blue-900">{photoTotals.fat}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">炭水化物:</span>
                    <span className="ml-1 font-medium text-blue-900">{photoTotals.carbs}g</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  {photoTotals.analyzedPhotoCount}枚の写真から自動計算
                </p>
              </div>
            )}

            {/* Add photo button (T028) */}
            {photos.length < 10 && (
              <PhotoUploadButton
                onUpload={handlePhotoUpload}
                disabled={isUploading}
                variant="secondary"
              />
            )}
            {photos.length >= 10 && (
              <p className="text-center text-sm text-gray-500">
                写真は最大10枚まで追加できます
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="py-4 text-center text-gray-500">まだ写真がありません</p>
            <PhotoUploadButton
              onUpload={handlePhotoUpload}
              disabled={isUploading}
              variant="primary"
            />
          </div>
        )}
      </div>

      {/* Analysis result with edit capabilities */}
      <AnalysisResult
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
