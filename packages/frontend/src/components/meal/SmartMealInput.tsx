import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  FoodItem,
  NutritionTotals,
  MealType,
  TextAnalysisResponse,
} from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import { mealAnalysisApi, getPhotoUrl } from '../../lib/api';
import { AnalysisResult } from './AnalysisResult';
import { UnifiedPhotoSelector } from './UnifiedPhotoSelector';
import { PhotoAnalysisReview } from './PhotoAnalysisReview';
import { PhotoUploadErrorBoundary } from './PhotoUploadErrorBoundary';
import { MealChat } from './MealChat';
import { toDateTimeLocal, getCurrentDateTimeLocal } from '../../lib/dateValidation';
import { toLocalISOString } from '../../lib/datetime';
import { usePhotoMealFlow } from '../../hooks/usePhotoMealFlow';
import type { AnalysisProgress } from '../../hooks/usePhotoMealFlow';
import { useMealItemEditor } from '../../hooks/useMealItemEditor';
import { useMealDateTime } from '../../hooks/useMealDateTime';

interface SmartMealInputProps {
  onSave: (mealId: string, mealType: MealType, recordedAt?: string) => Promise<void>;
  onRefresh?: () => void;
}

type InputState = 'idle' | 'analyzing' | 'result' | 'saving' | 'error';

export function SmartMealInput({ onSave, onRefresh }: SmartMealInputProps) {
  const queryClient = useQueryClient();
  const [inputState, setInputState] = useState<InputState>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis result state (for text flow)
  const [mealId, setMealId] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [totals, setTotals] = useState<NutritionTotals | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealTypeSource, setMealTypeSource] = useState<'text' | 'time'>('time');

  // Chat state (for text flow result)
  const [showChat, setShowChat] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | null>(null);

  // Date/time - for text flow
  const {
    recordedAt,
    setRecordedAt,
    dateTimeSource,
    setDateTimeSource,
    dateError,
    setDateError,
    handleDateTimeChange,
    validateForSave: validateDateForSave,
    reset: resetDateTime,
  } = useMealDateTime();

  const { updateItem: handleUpdateItem, deleteItem: handleDeleteItem, addItem: handleAddItem } =
    useMealItemEditor(mealId, setFoodItems, setTotals);

  // Unified photo flow
  const photoFlow = usePhotoMealFlow();

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;

    setInputState('analyzing');
    setError(null);

    try {
      const result = await mealAnalysisApi.analyzeText({
        text: text.trim(),
        currentTime: toLocalISOString(new Date()),
      });

      if ('error' in result) {
        setError(result.message);
        setInputState('error');
        return;
      }

      const response = result as TextAnalysisResponse;
      setMealId(response.mealId);
      setFoodItems(response.foodItems);
      setTotals(response.totals);
      setMealType(response.inferredMealType);
      setMealTypeSource(response.mealTypeSource);
      setRecordedAt(response.inferredRecordedAt);
      setDateTimeSource(response.dateTimeSource);
      setInputState('result');
      queryClient.invalidateQueries({ queryKey: ['ai-usage', 'daily'] });
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 429) {
        setError('本日のAI使用上限に達しました。明日以降に再度お試しください。');
        queryClient.invalidateQueries({ queryKey: ['ai-usage', 'daily'] });
      } else {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      }
      setInputState('error');
    }
  }, [text, queryClient, setRecordedAt, setDateTimeSource]);

  const handleSave = useCallback(async () => {
    if (!mealId) return;
    if (!validateDateForSave()) return;

    setInputState('saving');
    try {
      await onSave(mealId, mealType, recordedAt);
      setText('');
      setMealId(null);
      setFoodItems([]);
      setTotals(null);
      resetDateTime();
      setInputState('idle');
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setInputState('error');
    }
  }, [mealId, mealType, recordedAt, onSave, onRefresh, validateDateForSave, resetDateTime]);

  // Reset to idle state
  const handleReset = useCallback(() => {
    setText('');
    setMealId(null);
    setFoodItems([]);
    setTotals(null);
    setError(null);
    setPhotoKey(null);
    setShowChat(false);
    resetDateTime();
    setInputState('idle');
  }, [resetDateTime]);

  const handleManualFallback = useCallback(async () => {
    setError(null);
    setInputState('analyzing');

    try {
      const { mealId: newMealId } = await mealAnalysisApi.createEmptyMeal({
        content: text.trim() || undefined,
        recordedAt: toLocalISOString(new Date()),
      });
      setMealId(newMealId);
      setFoodItems([]);
      setTotals({ calories: 0, protein: 0, fat: 0, carbs: 0 });
      setInputState('result');
    } catch {
      setError('手動入力の作成に失敗しました');
      setInputState('error');
    }
  }, [text]);

  const handleChatUpdate = useCallback((updatedFoodItems: FoodItem[], updatedTotals: NutritionTotals, newRecordedAt?: string) => {
    setFoodItems(updatedFoodItems);
    setTotals(updatedTotals);
    if (newRecordedAt) {
      setRecordedAt(newRecordedAt);
      setDateTimeSource('text');
      setDateError(null);
    }
  }, [setRecordedAt, setDateTimeSource, setDateError]);

  // Photo flow: handle save from PhotoAnalysisReview
  const handlePhotoFlowSave = useCallback(async (photoMealId: string, photoMealType: MealType, photoRecordedAt?: string) => {
    await onSave(photoMealId, photoMealType, photoRecordedAt);
    photoFlow.reset();
    onRefresh?.();
  }, [onSave, photoFlow, onRefresh]);

  // Determine if we're in photo flow mode
  const isPhotoFlowActive = photoFlow.flowState !== 'idle';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Photo selector modal */}
      {photoFlow.flowState === 'selecting' && (
        <PhotoUploadErrorBoundary>
          <UnifiedPhotoSelector
            photos={photoFlow.photos}
            photoPreviewUrls={photoFlow.photoPreviewUrls}
            error={photoFlow.error}
            onAddPhotos={photoFlow.addPhotos}
            onRemovePhoto={photoFlow.removePhoto}
            onStartAnalysis={photoFlow.startAnalysis}
            onCancel={photoFlow.closeSelector}
          />
        </PhotoUploadErrorBoundary>
      )}

      {/* Photo analysis progress */}
      {photoFlow.flowState === 'analyzing' && photoFlow.analysisProgress && (
        <AnalysisProgressOverlay progress={photoFlow.analysisProgress} />
      )}

      {/* Photo flow: reviewing state */}
      {photoFlow.flowState === 'reviewing' && photoFlow.result && (
        <>
          {photoFlow.error && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-700">{photoFlow.error}</p>
            </div>
          )}
          <PhotoAnalysisReview
            mealId={photoFlow.result.mealId}
            initialFoodItems={photoFlow.result.foodItems}
            initialTotals={photoFlow.result.totals}
            photoUrl={photoFlow.result.photoKey ? getPhotoUrl(photoFlow.result.photoKey) ?? undefined : undefined}
            photoUrls={photoFlow.result.photoUrls}
            photoInfos={photoFlow.result.photoInfos}
            onSave={handlePhotoFlowSave}
            onCancel={photoFlow.reset}
            onRefresh={onRefresh}
          />
        </>
      )}

      {/* Text input flow: idle/error state */}
      {!isPhotoFlowActive && (inputState === 'idle' || inputState === 'error') && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 gap-2">
              {/* Unified photo button */}
              <button
                onClick={photoFlow.openSelector}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-3 text-xl hover:bg-gray-50"
                title="写真で分析"
                aria-label="写真で分析"
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

      {!isPhotoFlowActive && inputState === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">食事を分析中...</p>
        </div>
      )}

      {!isPhotoFlowActive && (inputState === 'result' || inputState === 'saving') && totals && (
        <div className="space-y-4">
          {/* Input text display */}
          {text && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-500">入力:</span>
              <span className="ml-2 font-medium">{text}</span>
            </div>
          )}

          <AnalysisResult
            photoUrl={photoKey ? getPhotoUrl(photoKey) ?? undefined : undefined}
            foodItems={foodItems}
            totals={totals}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
          />

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

/** Progress overlay for multi-photo analysis */
function AnalysisProgressOverlay({ progress }: { progress: AnalysisProgress }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="text-gray-600">
        写真 {Math.min(progress.current + 1, progress.total)}/{progress.total} を分析中...
      </p>
      <div className="w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${(progress.current / progress.total) * 100}%`,
            }}
          />
        </div>
        {/* Per-photo status */}
        <div className="mt-2 flex justify-center gap-1">
          {progress.statuses.map((status, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                status === 'done' ? 'bg-green-500' :
                status === 'analyzing' ? 'animate-pulse bg-blue-500' :
                status === 'error' ? 'bg-red-500' :
                'bg-gray-300'
              }`}
              title={`写真${i + 1}: ${status}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
