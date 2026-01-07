import { useState, useCallback, useEffect } from 'react';
import type {
  FoodItem,
  NutritionTotals,
  MealType,
  TextAnalysisResponse,
  DateTimeSource,
} from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import { mealAnalysisApi, getPhotoUrl } from '../../lib/api';
import { resizeImages } from '../../lib/imageResize';
import { AnalysisResult } from './AnalysisResult';
import { PhotoCapture } from './PhotoCapture';
import { MealChat } from './MealChat';
import { validateNotFuture, toDateTimeLocal, getCurrentDateTimeLocal } from '../../lib/dateValidation';

interface SmartMealInputProps {
  onSave: (mealId: string, mealType: MealType, recordedAt?: string) => Promise<void>;
  onRefresh?: () => void;
}

type InputState = 'idle' | 'analyzing' | 'result' | 'saving' | 'error';

export function SmartMealInput({ onSave, onRefresh }: SmartMealInputProps) {
  const [inputState, setInputState] = useState<InputState>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis result state
  const [mealId, setMealId] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [totals, setTotals] = useState<NutritionTotals | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealTypeSource, setMealTypeSource] = useState<'text' | 'time'>('time');

  // Photo and chat state (T024-T028)
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | null>(null);

  // Multi-photo mode state (T058-T061 - User Story 4)
  const [multiPhotoMode, setMultiPhotoMode] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Date/time state (011-meal-datetime)
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString());
  const [dateTimeSource, setDateTimeSource] = useState<DateTimeSource>('now');
  const [dateError, setDateError] = useState<string | null>(null);

  // Disable body scroll during upload
  useEffect(() => {
    if (uploadProgress) {
      // Save original overflow value
      const originalOverflow = document.body.style.overflow;
      // Disable scroll
      document.body.style.overflow = 'hidden';

      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [uploadProgress]);

  // Submit text for analysis (T012)
  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;

    setInputState('analyzing');
    setError(null);

    try {
      const result = await mealAnalysisApi.analyzeText({ text: text.trim() });

      // Check if it's an error response
      if ('error' in result) {
        setError(result.message);
        setInputState('error');
        return;
      }

      // Success - update state with analysis result
      const response = result as TextAnalysisResponse;
      setMealId(response.mealId);
      setFoodItems(response.foodItems);
      setTotals(response.totals);
      setMealType(response.inferredMealType);
      setMealTypeSource(response.mealTypeSource);
      setRecordedAt(response.inferredRecordedAt);
      setDateTimeSource(response.dateTimeSource);
      setInputState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setInputState('error');
    }
  }, [text]);

  // Update food item (T015)
  const handleUpdateItem = useCallback(async (itemId: string, updates: Partial<FoodItem>) => {
    if (!mealId) return;

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

  // Delete food item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!mealId) return;

    try {
      const result = await mealAnalysisApi.deleteFoodItem(mealId, itemId);
      setFoodItems(prev => prev.filter(item => item.id !== itemId));
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to delete food item:', err);
    }
  }, [mealId]);

  // Add food item
  const handleAddItem = useCallback(async (item: Omit<FoodItem, 'id'>) => {
    if (!mealId) return;

    try {
      const result = await mealAnalysisApi.addFoodItem(mealId, item);
      setFoodItems(prev => [...prev, result.foodItem]);
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to add food item:', err);
    }
  }, [mealId]);

  // Save meal (T016)
  const handleSave = useCallback(async () => {
    if (!mealId) return;

    // Validate date before saving
    const validationError = validateNotFuture(recordedAt);
    if (validationError) {
      setDateError(validationError);
      return;
    }

    setInputState('saving');
    try {
      await onSave(mealId, mealType, recordedAt);
      // Reset state
      setText('');
      setMealId(null);
      setFoodItems([]);
      setTotals(null);
      setRecordedAt(new Date().toISOString());
      setDateTimeSource('now');
      setDateError(null);
      setInputState('idle');
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setInputState('error');
    }
  }, [mealId, mealType, recordedAt, onSave, onRefresh]);

  // Reset to idle state
  const handleReset = useCallback(() => {
    setText('');
    setMealId(null);
    setFoodItems([]);
    setTotals(null);
    setError(null);
    setPhotoKey(null);
    setShowChat(false);
    setRecordedAt(new Date().toISOString());
    setDateTimeSource('now');
    setDateError(null);
    setInputState('idle');
  }, []);

  // Fallback to manual input (T017)
  const handleManualFallback = useCallback(() => {
    setError(null);
    setInputState('idle');
  }, []);

  // Handle date/time change (011-meal-datetime)
  const handleDateTimeChange = useCallback((newDateTime: string) => {
    const isoDateTime = new Date(newDateTime).toISOString();
    const validationError = validateNotFuture(isoDateTime);
    if (validationError) {
      setDateError(validationError);
      return;
    }
    setDateError(null);
    setRecordedAt(isoDateTime);
    setDateTimeSource('now'); // Once manually changed, it's no longer from text
  }, []);

  // Handle photo capture (T024-T026)
  const handlePhotoCapture = useCallback(async (photo: Blob) => {
    setShowPhotoCapture(false);
    setInputState('analyzing');
    setError(null);

    try {
      const result = await mealAnalysisApi.analyzeMealPhoto(photo);

      // Check if it's an error response
      if ('error' in result) {
        setError(result.message);
        setInputState('error');
        return;
      }

      // Success - update state with analysis result
      setMealId(result.mealId);
      setFoodItems(result.foodItems);
      setTotals(result.totals);
      setPhotoKey(result.photoKey);
      // Default to lunch since photo analysis doesn't infer meal type
      setMealType('lunch');
      setMealTypeSource('time');
      setInputState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setInputState('error');
    }
  }, []);

  // Handle chat updates (T027-T028) - now includes date/time changes
  const handleChatUpdate = useCallback((updatedFoodItems: FoodItem[], updatedTotals: NutritionTotals, newRecordedAt?: string) => {
    setFoodItems(updatedFoodItems);
    setTotals(updatedTotals);
    if (newRecordedAt) {
      setRecordedAt(newRecordedAt);
      setDateTimeSource('text'); // Changed via chat, show as 'from text'
      setDateError(null);
    }
  }, []);

  // Multi-photo handlers (T058-T061)
  const handleAddPhotos = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return;

    const filesArray = Array.from(newFiles);
    const validFiles = filesArray.filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルのみ選択できます');
        return false;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下にしてください');
        return false;
      }
      return true;
    });

    // Check total count (max 10 photos)
    if (photos.length + validFiles.length > 10) {
      setError('写真は最大10枚までです');
      return;
    }

    // Resize images before adding to state
    const resizedFiles = await resizeImages(validFiles);

    // Create preview URLs from resized images
    const newPreviewUrls = resizedFiles.map(file => URL.createObjectURL(file));

    setPhotos(prev => [...prev, ...resizedFiles]);
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setError(null);
  }, [photos.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    // Revoke object URL to free memory
    const url = photoPreviewUrls[index];
    if (url) {
      URL.revokeObjectURL(url);
    }

    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, [photoPreviewUrls]);

  // Save meal with multiple photos (T061) - Upload one by one
  const handleSaveMultiPhoto = useCallback(async () => {
    if (photos.length === 0) {
      setError('少なくとも1枚の写真を選択してください');
      return;
    }

    // Validate date
    const validationError = validateNotFuture(recordedAt);
    if (validationError) {
      setDateError(validationError);
      return;
    }

    setInputState('saving');
    setUploadProgress({ current: 0, total: photos.length });
    setError(null);

    try {
      // 1. Create meal with first photo
      const firstPhoto = photos[0];
      if (!firstPhoto) {
        throw new Error('写真が選択されていません');
      }

      const firstResult = await mealAnalysisApi.createMealWithPhoto({
        mealType,
        content: '写真から記録',
        recordedAt,
        photo: firstPhoto,
      });

      setUploadProgress({ current: 1, total: photos.length });

      // 2. Add remaining photos one by one
      for (let i = 1; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo) continue;
        await mealAnalysisApi.addPhotoToMeal(firstResult.meal.id, photo);
        setUploadProgress({ current: i + 1, total: photos.length });
      }

      // Reset state
      setMultiPhotoMode(false);
      setPhotos([]);
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setPhotoPreviewUrls([]);
      setUploadProgress(null);
      setRecordedAt(new Date().toISOString());
      setDateTimeSource('now');
      setDateError(null);
      setInputState('idle');
      onRefresh?.();
    } catch (err) {
      const currentPhoto = uploadProgress ? uploadProgress.current + 1 : 1;
      setError(
        err instanceof Error
          ? `写真${currentPhoto}/${photos.length}のアップロードに失敗しました: ${err.message}`
          : `写真${currentPhoto}/${photos.length}のアップロードに失敗しました`
      );
      setUploadProgress(null);
      setInputState('idle');
    }
  }, [photos, photoPreviewUrls, mealType, recordedAt, onRefresh, uploadProgress]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Upload progress overlay - Block all interactions during upload */}
      {uploadProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="space-y-4">
              <h3 className="text-center text-lg font-medium text-gray-900">
                写真をアップロード中...
              </h3>
              <div className="space-y-2">
                <div className="text-center text-sm text-gray-600">
                  {uploadProgress.current}/{uploadProgress.total} 枚完了
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-center text-xs text-gray-500">
                アップロード中は他の操作ができません
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photo capture modal (T024-T025) */}
      {showPhotoCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4">
            <PhotoCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setShowPhotoCapture(false)}
            />
          </div>
        </div>
      )}

      {/* Input State: idle, error, or saving with multi-photo mode */}
      {(inputState === 'idle' || inputState === 'error' || (inputState === 'saving' && multiPhotoMode)) && (
        <div className="space-y-3">
          {/* Mode toggle (T058) */}
          {!multiPhotoMode && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 gap-2">
                  {/* Photo button (T024) */}
                  <button
                    onClick={() => setShowPhotoCapture(true)}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-3 text-xl hover:bg-gray-50"
                    title="写真で分析"
                  >
                    📷
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="食事内容を入力 (例: カレーライス)"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="shrink-0 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  記録推論
                </button>
              </div>

              {/* Multi-photo mode button */}
              <button
                onClick={() => setMultiPhotoMode(true)}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                📸 複数写真で記録する
              </button>
            </>
          )}

          {/* Multi-photo mode UI (T058-T061) */}
          {multiPhotoMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">複数写真で記録</h3>
                <button
                  onClick={() => {
                    setMultiPhotoMode(false);
                    setPhotos([]);
                    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                    setPhotoPreviewUrls([]);
                  }}
                  disabled={uploadProgress !== null}
                  className="text-sm text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>

              {/* Photo preview list (T059) */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`写真 ${index + 1}`}
                        className="h-full w-full rounded-lg object-cover"
                      />
                      {/* Remove button (T060) */}
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        disabled={uploadProgress !== null}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="削除"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                        {index + 1}/{photos.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo button (T058) */}
              {photos.length < 10 && !uploadProgress && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleAddPhotos(e.target.files)}
                    className="hidden"
                  />
                  <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-blue-500 hover:bg-blue-50">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm text-gray-600">
                      {photos.length === 0 ? '写真を選択（最大10枚）' : '写真を追加'}
                    </span>
                  </div>
                </label>
              )}

              {photos.length >= 10 && (
                <p className="text-sm text-gray-500">最大10枚まで選択できます</p>
              )}

              {/* Meal type and date/time */}
              {photos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">食事タイプ:</label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as MealType)}
                      disabled={uploadProgress !== null}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="breakfast">朝食</option>
                      <option value="lunch">昼食</option>
                      <option value="dinner">夕食</option>
                      <option value="snack">間食</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">記録日時:</label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(recordedAt)}
                      max={getCurrentDateTimeLocal()}
                      onChange={(e) => {
                        const newDateTime = new Date(e.target.value).toISOString();
                        setRecordedAt(newDateTime);
                        setDateTimeSource('now');
                      }}
                      disabled={uploadProgress !== null}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {dateError && (
                    <p className="text-sm text-red-600">{dateError}</p>
                  )}

                  {/* Save button */}
                  <button
                    onClick={handleSaveMultiPhoto}
                    disabled={photos.length === 0 || uploadProgress !== null}
                    className="w-full rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadProgress ? 'アップロード中...' : `保存して分析（${photos.length}枚の写真）`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error message (T017) */}
          {inputState === 'error' && error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={handleManualFallback}
                className="mt-2 text-sm text-red-600 underline hover:text-red-700"
              >
                手動で入力する
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State (T011) */}
      {inputState === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">食事を分析中...</p>
        </div>
      )}

      {/* Result State (T014) */}
      {(inputState === 'result' || inputState === 'saving') && totals && (
        <div className="space-y-4">
          {/* Input text display */}
          {text && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-500">入力:</span>
              <span className="ml-2 font-medium">{text}</span>
            </div>
          )}

          {/* Analysis result with photo (T026) */}
          <AnalysisResult
            photoUrl={photoKey ? getPhotoUrl(photoKey) ?? undefined : undefined}
            foodItems={foodItems}
            totals={totals}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
          />

          {/* Chat toggle and panel (T027-T028) */}
          {mealId && (
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
          )}

          {/* Date/time selector (011-meal-datetime) */}
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

          {/* Meal type selector (T016) */}
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
            {/* Meal type source indicator (Phase 4: T022) */}
            <span className="text-xs text-gray-400">
              ({mealTypeSource === 'text' ? 'テキストから判定' : '時刻から推測'})
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={inputState === 'saving'}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={inputState === 'saving'}
              className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {inputState === 'saving' ? '保存中...' : '記録する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
