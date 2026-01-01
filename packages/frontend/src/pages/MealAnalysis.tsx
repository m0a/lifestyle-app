import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoCapture } from '../components/meal/PhotoCapture';
import { AnalysisResult } from '../components/meal/AnalysisResult';
import { MealChat } from '../components/meal/MealChat';
import { useToast } from '../components/ui/Toast';
import { mealAnalysisApi, type MealAnalysisResponse } from '../lib/api';
import type { FoodItem, NutritionTotals, MealType, AnalysisFailure } from '@lifestyle-app/shared';

// Helper to get user-friendly error message
function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'ネットワークに接続できません。インターネット接続を確認してください。';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '予期しないエラーが発生しました';
}

type AnalysisState =
  | { phase: 'capture' }
  | { phase: 'analyzing' }
  | { phase: 'result'; mealId: string; photoUrl: string; foodItems: FoodItem[]; totals: NutritionTotals }
  | { phase: 'error'; message: string };

export default function MealAnalysisPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState<AnalysisState>({ phase: 'capture' });
  const [showChat, setShowChat] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoCapture = useCallback(async (photo: Blob) => {
    setState({ phase: 'analyzing' });

    try {
      const result = await mealAnalysisApi.analyzeMealPhoto(photo);

      if ('error' in result) {
        const failure = result as AnalysisFailure;
        setState({ phase: 'error', message: failure.message });
        return;
      }

      const analysisResult = result as MealAnalysisResponse;
      setState({
        phase: 'result',
        mealId: analysisResult.mealId,
        photoUrl: `/api/meals/photos/${encodeURIComponent(analysisResult.photoKey)}`,
        foodItems: analysisResult.foodItems,
        totals: analysisResult.totals,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : '分析中にエラーが発生しました',
      });
    }
  }, []);

  const handleUpdateItem = useCallback(
    async (itemId: string, updates: Partial<FoodItem>) => {
      if (state.phase !== 'result') return;

      try {
        const result = await mealAnalysisApi.updateFoodItem(state.mealId, itemId, updates);
        setState({
          ...state,
          foodItems: state.foodItems.map((item) =>
            item.id === itemId ? result.foodItem : item
          ),
          totals: result.updatedTotals,
        });
      } catch (error) {
        console.error('Update item error:', error);
        toast.error(getErrorMessage(error));
      }
    },
    [state, toast]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (state.phase !== 'result') return;

      try {
        const result = await mealAnalysisApi.deleteFoodItem(state.mealId, itemId);
        setState({
          ...state,
          foodItems: state.foodItems.filter((item) => item.id !== itemId),
          totals: result.updatedTotals,
        });
      } catch (error) {
        console.error('Delete item error:', error);
        toast.error(getErrorMessage(error));
      }
    },
    [state, toast]
  );

  const handleAddItem = useCallback(
    async (item: Omit<FoodItem, 'id'>) => {
      if (state.phase !== 'result') return;

      try {
        const result = await mealAnalysisApi.addFoodItem(state.mealId, item);
        setState({
          ...state,
          foodItems: [...state.foodItems, result.foodItem],
          totals: result.updatedTotals,
        });
      } catch (error) {
        console.error('Add item error:', error);
        toast.error(getErrorMessage(error));
      }
    },
    [state, toast]
  );

  const handleChatUpdate = useCallback(
    (foodItems: FoodItem[], totals: NutritionTotals) => {
      if (state.phase !== 'result') return;
      setState({ ...state, foodItems, totals });
    },
    [state]
  );

  const handleSave = useCallback(async () => {
    if (state.phase !== 'result') return;

    setIsSaving(true);
    try {
      await mealAnalysisApi.saveMealAnalysis(state.mealId, selectedMealType);
      toast.success('食事を記録しました');
      navigate('/meals');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [state, selectedMealType, navigate, toast]);

  const handleReset = useCallback(() => {
    setState({ phase: 'capture' });
    setShowChat(false);
  }, []);

  return (
    <div className="mx-auto max-w-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI食事分析</h1>
        {state.phase === 'result' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            やり直す
          </button>
        )}
      </div>

      {state.phase === 'capture' && (
        <PhotoCapture onCapture={handlePhotoCapture} onCancel={() => navigate(-1)} />
      )}

      {state.phase === 'analyzing' && (
        <AnalysisResult
          foodItems={[]}
          totals={{ calories: 0, protein: 0, fat: 0, carbs: 0 }}
          isLoading
        />
      )}

      {state.phase === 'error' && (
        <div className="flex flex-col items-center gap-4 rounded-lg bg-red-50 p-6">
          <p className="text-red-600">{state.message}</p>
          <button
            onClick={handleReset}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            もう一度撮影する
          </button>
        </div>
      )}

      {state.phase === 'result' && (
        <div className="space-y-4">
          <AnalysisResult
            photoUrl={state.photoUrl}
            foodItems={state.foodItems}
            totals={state.totals}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
          />

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full rounded-lg border py-3 text-center hover:bg-gray-50"
          >
            {showChat ? '💬 チャットを閉じる' : '💬 AIと相談して調整'}
          </button>

          {showChat && (
            <MealChat
              mealId={state.mealId}
              currentFoodItems={state.foodItems}
              onUpdate={handleChatUpdate}
            />
          )}

          {/* Save section */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">記録として保存</h3>
            <div className="mb-4 flex gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`flex-1 rounded-lg py-2 text-sm ${
                    selectedMealType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  {type === 'breakfast' && '朝食'}
                  {type === 'lunch' && '昼食'}
                  {type === 'dinner' && '夕食'}
                  {type === 'snack' && '間食'}
                </button>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || state.foodItems.length === 0}
              className="w-full rounded-lg bg-blue-500 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '食事を記録する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
