import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, getPhotoUrl, mealAnalysisApi } from '../lib/api';
import { MealEditMode } from '../components/meal/MealEditMode';
import type { MealRecord, FoodItem, ChatMessage, NutritionTotals } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

// Hook to warn about unsaved changes on navigation/refresh (T040)
function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}

interface MealDetailResponse {
  meal: MealRecord;
}

interface MealPhoto {
  id: string;
  photoKey: string;
  photoUrl: string;
}

export default function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<MealRecord | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Warn before leaving with unsaved changes (T040)
  useUnsavedChangesWarning(hasUnsavedChanges);

  useEffect(() => {
    if (!mealId) return;

    const loadMealData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load meal record
        const mealResponse = await api.get<MealDetailResponse>(`/api/meals/${mealId}`);
        setMeal(mealResponse.meal);

        // Load photos
        try {
          const photosResponse = await api.get<{ photos: MealPhoto[] }>(`/api/meals/${mealId}/photos`);
          setPhotos(photosResponse.photos);
        } catch {
          setPhotos([]);
        }

        // Load food items if this is an AI-analyzed meal
        if (mealResponse.meal.analysisSource === 'ai') {
          try {
            const { foodItems: items } = await mealAnalysisApi.getFoodItems(mealId);
            setFoodItems(items);
          } catch {
            // Food items might not exist for older records
            setFoodItems([]);
          }

          // Load chat history
          try {
            const { messages } = await mealAnalysisApi.getChatHistory(mealId);
            setChatHistory(messages);
          } catch {
            setChatHistory([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadMealData();
  }, [mealId]);

  const reloadMealData = useCallback(async () => {
    if (!mealId) return;

    try {
      const mealResponse = await api.get<MealDetailResponse>(`/api/meals/${mealId}`);
      setMeal(mealResponse.meal);

      // Reload photos
      try {
        const photosResponse = await api.get<{ photos: MealPhoto[] }>(`/api/meals/${mealId}/photos`);
        setPhotos(photosResponse.photos);
      } catch {
        setPhotos([]);
      }

      if (mealResponse.meal.analysisSource === 'ai') {
        const { foodItems: items } = await mealAnalysisApi.getFoodItems(mealId);
        setFoodItems(items);
      }
    } catch (err) {
      console.error('Failed to reload meal data:', err);
    }
  }, [mealId]);

  const handleEditSave = useCallback(() => {
    setHasUnsavedChanges(false);
    setIsEditing(false);
    reloadMealData();
  }, [reloadMealData]);

  const handleEditCancel = useCallback(() => {
    setHasUnsavedChanges(false);
    setIsEditing(false);
    reloadMealData();
  }, [reloadMealData]);

  const getTotals = useCallback((): NutritionTotals => {
    return {
      calories: meal?.calories ?? 0,
      protein: meal?.totalProtein ?? 0,
      fat: meal?.totalFat ?? 0,
      carbs: meal?.totalCarbs ?? 0,
    };
  }, [meal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <p className="text-red-600">{error || '食事記録が見つかりません'}</p>
          <button
            onClick={() => navigate('/meals')}
            className="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            食事記録一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const firstPhoto = photos.length > 0 ? photos[0] : null;

  // Edit mode view
  if (isEditing) {
    return (
      <div className="mx-auto max-w-lg p-4">
        {/* Edit mode header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleEditCancel}
            className="text-gray-600 hover:text-gray-800"
          >
            ← キャンセル
          </button>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
            編集中
          </span>
        </div>

        <MealEditMode
          meal={meal}
          foodItems={foodItems}
          totals={getTotals()}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onDirtyChange={setHasUnsavedChanges}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/meals" className="text-blue-600 hover:text-blue-800">
          ← 戻る
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
            {MEAL_TYPE_LABELS[meal.mealType]}
          </span>
          {meal.analysisSource && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                meal.analysisSource === 'ai'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {meal.analysisSource === 'ai' ? 'AI分析' : '手動入力'}
            </span>
          )}
        </div>
      </div>

      {/* Photo */}
      {firstPhoto && (
        <div className="mb-4 overflow-hidden rounded-lg">
          <img
            src={firstPhoto.photoUrl}
            alt={meal.content}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Meal info */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <h1 className="text-lg font-semibold text-gray-900">{meal.content}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(meal.recordedAt).toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Nutrition summary */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-orange-50 p-2">
            <div className="text-lg font-bold text-orange-600">
              {meal.calories?.toLocaleString() ?? '-'}
            </div>
            <div className="text-xs text-gray-500">kcal</div>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <div className="text-lg font-bold text-red-600">
              {meal.totalProtein ?? '-'}
            </div>
            <div className="text-xs text-gray-500">P (g)</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-2">
            <div className="text-lg font-bold text-yellow-600">
              {meal.totalFat ?? '-'}
            </div>
            <div className="text-xs text-gray-500">F (g)</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2">
            <div className="text-lg font-bold text-blue-600">
              {meal.totalCarbs ?? '-'}
            </div>
            <div className="text-xs text-gray-500">C (g)</div>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setIsEditing(true)}
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
        >
          編集する
        </button>
      </div>

      {/* Food items list */}
      {foodItems.length > 0 && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">食材一覧</h2>
          <div className="space-y-2">
            {foodItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({item.portion === 'small' ? '少量' : item.portion === 'large' ? '多め' : '普通'})
                  </span>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">{item.calories} kcal</span>
                  <div className="text-xs text-gray-400">
                    P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat history */}
      {chatHistory.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">AIとの会話履歴</h2>
          <div className="space-y-3 text-sm">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'ml-8 bg-blue-100 text-blue-900'
                    : 'mr-8 bg-gray-100 text-gray-800'
                }`}
              >
                <div className="mb-1 text-xs font-medium text-gray-500">
                  {msg.role === 'user' ? 'あなた' : 'AI'}
                </div>
                <div>{msg.content}</div>
                {msg.appliedChanges && msg.appliedChanges.length > 0 && (
                  <div className="mt-2 border-t pt-2 text-xs text-gray-500">
                    適用された変更: {msg.appliedChanges.length}件
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
