import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FoodItem,
  NutritionTotals,
  MealType,
  DateTimeSource,
} from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import { mealAnalysisApi } from '../../lib/api';
import { AnalysisResult } from './AnalysisResult';
import { MealChat } from './MealChat';
import { validateNotFuture, toDateTimeLocal, getCurrentDateTimeLocal } from '../../lib/dateValidation';
import { fromDatetimeLocal, toLocalISOString } from '../../lib/datetime';
import type { PhotoInfo } from '../../hooks/usePhotoMealFlow';

interface PhotoAnalysisReviewProps {
  mealId: string;
  initialFoodItems: FoodItem[];
  initialTotals: NutritionTotals;
  photoUrl?: string;
  photoUrls?: string[];
  photoInfos?: PhotoInfo[];
  onSave: (mealId: string, mealType: MealType, recordedAt?: string) => Promise<void>;
  onCancel: () => void;
  onRefresh?: () => void;
}

export function PhotoAnalysisReview({
  mealId,
  initialFoodItems,
  initialTotals,
  photoUrl,
  photoUrls,
  photoInfos: initialPhotoInfos,
  onSave,
  onCancel,
  onRefresh,
}: PhotoAnalysisReviewProps) {
  // Local food items state (owned by this component)
  const [foodItems, setFoodItems] = useState<FoodItem[]>(initialFoodItems);
  const [totals, setTotals] = useState<NutritionTotals>(initialTotals);
  const [photoInfos, setPhotoInfos] = useState<PhotoInfo[]>(initialPhotoInfos ?? []);

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [recordedAt, setRecordedAt] = useState<string>(toLocalISOString(new Date()));
  const [dateTimeSource, setDateTimeSource] = useState<DateTimeSource>('now');
  const [dateError, setDateError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reanalyzingIds, setReanalyzingIds] = useState<Set<string>>(new Set());
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Cleanup poll timers on unmount
  useEffect(() => {
    return () => {
      pollTimersRef.current.forEach(timer => clearInterval(timer));
    };
  }, []);

  // Food item edit callbacks (same pattern as text flow in SmartMealInput)
  const handleUpdateItem = useCallback(async (itemId: string, updates: Partial<FoodItem>) => {
    try {
      const result = await mealAnalysisApi.updateFoodItem(mealId, itemId, updates);
      setFoodItems(prev => prev.map(item =>
        item.id === itemId ? result.foodItem : item
      ));
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to update food item:', err);
    }
  }, [mealId]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      const result = await mealAnalysisApi.deleteFoodItem(mealId, itemId);
      setFoodItems(prev => prev.filter(item => item.id !== itemId));
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to delete food item:', err);
    }
  }, [mealId]);

  const handleAddItem = useCallback(async (item: Omit<FoodItem, 'id'>) => {
    try {
      const result = await mealAnalysisApi.addFoodItem(mealId, item);
      setFoodItems(prev => [...prev, result.foodItem]);
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to add food item:', err);
    }
  }, [mealId]);

  const handleDateTimeChange = useCallback((newDateTime: string) => {
    const isoDateTime = fromDatetimeLocal(newDateTime);
    const validationError = validateNotFuture(isoDateTime);
    if (validationError) {
      setDateError(validationError);
      return;
    }
    setDateError(null);
    setRecordedAt(isoDateTime);
    setDateTimeSource('now');
  }, []);

  const handleChatUpdate = useCallback((updatedFoodItems: FoodItem[], updatedTotals: NutritionTotals, newRecordedAt?: string, newMealType?: MealType) => {
    setFoodItems(updatedFoodItems);
    setTotals(updatedTotals);
    if (newRecordedAt) {
      setRecordedAt(newRecordedAt);
      setDateTimeSource('text');
      setDateError(null);
    }
    if (newMealType) {
      setMealType(newMealType);
    }
  }, []);

  // Refresh food items and totals from server
  const refreshFromServer = useCallback(async () => {
    try {
      const [foodItemsResult, photosResult] = await Promise.all([
        mealAnalysisApi.getFoodItems(mealId),
        mealAnalysisApi.getMealPhotos(mealId),
      ]);
      setFoodItems(foodItemsResult.foodItems);
      setTotals(photosResult.totals);
      setPhotoInfos(photosResult.photos.map(p => ({
        id: p.id,
        photoUrl: p.photoUrl,
        analysisStatus: p.analysisStatus as PhotoInfo['analysisStatus'],
      })));
    } catch (err) {
      console.error('Failed to refresh from server:', err);
    }
  }, [mealId]);

  // Re-analyze a failed photo
  const handleReanalyze = useCallback(async (photoId: string) => {
    try {
      setReanalyzingIds(prev => new Set(prev).add(photoId));
      setPhotoInfos(prev => prev.map(p =>
        p.id === photoId ? { ...p, analysisStatus: 'analyzing' as const } : p
      ));

      await mealAnalysisApi.reanalyzePhoto(mealId, photoId);

      // Poll for completion
      const timer = setInterval(async () => {
        try {
          const status = await mealAnalysisApi.getPhotoStatus(mealId, photoId);
          if (status.status === 'complete' || status.status === 'failed') {
            clearInterval(timer);
            pollTimersRef.current.delete(photoId);
            setReanalyzingIds(prev => {
              const next = new Set(prev);
              next.delete(photoId);
              return next;
            });
            // Refresh all data from server
            await refreshFromServer();
          }
        } catch {
          clearInterval(timer);
          pollTimersRef.current.delete(photoId);
          setReanalyzingIds(prev => {
            const next = new Set(prev);
            next.delete(photoId);
            return next;
          });
        }
      }, 3000);

      pollTimersRef.current.set(photoId, timer);
    } catch (err) {
      console.error('Failed to re-analyze photo:', err);
      setReanalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      setPhotoInfos(prev => prev.map(p =>
        p.id === photoId ? { ...p, analysisStatus: 'failed' as const } : p
      ));
    }
  }, [mealId, refreshFromServer]);

  const handleSave = useCallback(async () => {
    const validationError = validateNotFuture(recordedAt);
    if (validationError) {
      setDateError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(mealId, mealType, recordedAt);
      onRefresh?.();
    } finally {
      setIsSaving(false);
    }
  }, [mealId, mealType, recordedAt, onSave, onRefresh]);

  // Pick photo URL for display
  const displayPhotoUrl = photoUrl || (photoUrls && photoUrls.length > 0 ? photoUrls[0] : undefined);
  const hasMultiplePhotos = (photoInfos.length > 1) || (photoUrls && photoUrls.length > 1);
  const hasFailedPhotos = photoInfos.some(p => p.analysisStatus === 'failed');

  return (
    <div className="space-y-4">
      {/* Photo thumbnails with analysis status */}
      {hasMultiplePhotos && photoInfos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {photoInfos.map((info) => (
            <div key={info.id} className="relative shrink-0">
              <img
                src={info.photoUrl}
                alt={`写真`}
                className={`h-20 w-20 rounded-lg object-cover ${
                  info.analysisStatus === 'failed' ? 'opacity-60 ring-2 ring-red-400' :
                  info.analysisStatus === 'analyzing' ? 'opacity-60 ring-2 ring-blue-400' :
                  ''
                }`}
              />
              {info.analysisStatus === 'failed' && !reanalyzingIds.has(info.id) && (
                <button
                  onClick={() => handleReanalyze(info.id)}
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xs font-medium text-white hover:bg-black/50"
                  title="再分析"
                >
                  再分析
                </button>
              )}
              {(info.analysisStatus === 'analyzing' || reanalyzingIds.has(info.id)) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Fallback: show photoUrls when no photoInfos */}
      {hasMultiplePhotos && photoInfos.length === 0 && photoUrls && photoUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {photoUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`写真 ${index + 1}`}
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* Re-analyze all failed button */}
      {hasFailedPhotos && !reanalyzingIds.size && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-800">
            分析に失敗した写真があります。
            <button
              onClick={() => {
                photoInfos
                  .filter(p => p.analysisStatus === 'failed')
                  .forEach(p => handleReanalyze(p.id));
              }}
              className="ml-1 font-medium text-amber-700 underline hover:text-amber-900"
            >
              すべて再分析
            </button>
          </p>
        </div>
      )}

      {/* Analysis result */}
      <AnalysisResult
        photoUrl={hasMultiplePhotos ? undefined : displayPhotoUrl}
        foodItems={foodItems}
        totals={totals}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onAddItem={handleAddItem}
      />

      {/* Chat toggle */}
      <div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
        >
          <span>💬</span>
          <span>{showChat ? 'チャットを閉じる' : 'AIと相談して調整'}</span>
        </button>
        {showChat && (
          <div className="mt-3">
            <MealChat
              mealId={mealId}
              currentFoodItems={foodItems}
              onUpdate={handleChatUpdate}
            />
          </div>
        )}
      </div>

      {/* Date/time selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">記録日時:</label>
          <input
            type="datetime-local"
            value={toDateTimeLocal(recordedAt)}
            max={getCurrentDateTimeLocal()}
            onChange={(e) => handleDateTimeChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">
            ({dateTimeSource === 'text' ? 'テキストから推測' : '現在時刻'})
          </span>
        </div>
        {dateError && (
          <p className="text-sm text-red-600">{dateError}</p>
        )}
      </div>

      {/* Meal type selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">食事タイプ:</label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || reanalyzingIds.size > 0}
          className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : reanalyzingIds.size > 0 ? '再分析中...' : '記録する'}
        </button>
      </div>
    </div>
  );
}
