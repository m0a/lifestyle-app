import { useState, useCallback } from 'react';
import type {
  FoodItem,
  NutritionTotals,
  MealType,
  TextAnalysisResponse,
  DateTimeSource,
} from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import { mealAnalysisApi, getPhotoUrl } from '../../lib/api';
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

  // Date/time state (011-meal-datetime)
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString());
  const [dateTimeSource, setDateTimeSource] = useState<DateTimeSource>('now');
  const [dateError, setDateError] = useState<string | null>(null);

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

  // Handle chat updates (T027-T028)
  const handleChatUpdate = useCallback((updatedFoodItems: FoodItem[], updatedTotals: NutritionTotals) => {
    setFoodItems(updatedFoodItems);
    setTotals(updatedTotals);
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
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

      {/* Input State: idle or error */}
      {(inputState === 'idle' || inputState === 'error') && (
        <div className="space-y-3">
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
