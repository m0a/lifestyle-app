import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { FoodItem, NutritionTotals } from '@lifestyle-app/shared';
import { mealAnalysisApi } from '../lib/api';

export function useMealItemEditor(
  mealId: string | null,
  setFoodItems: Dispatch<SetStateAction<FoodItem[]>>,
  setTotals: (totals: NutritionTotals) => void,
) {
  const updateItem = useCallback(async (itemId: string, updates: Partial<FoodItem>) => {
    if (!mealId) return;
    try {
      const result = await mealAnalysisApi.updateFoodItem(mealId, itemId, updates);
      setFoodItems(prev => prev.map(item => (item.id === itemId ? result.foodItem : item)));
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to update food item:', err);
    }
  }, [mealId, setFoodItems, setTotals]);

  const deleteItem = useCallback(async (itemId: string) => {
    if (!mealId) return;
    try {
      const result = await mealAnalysisApi.deleteFoodItem(mealId, itemId);
      setFoodItems(prev => prev.filter(item => item.id !== itemId));
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to delete food item:', err);
    }
  }, [mealId, setFoodItems, setTotals]);

  const addItem = useCallback(async (item: Omit<FoodItem, 'id'>) => {
    if (!mealId) return;
    try {
      const result = await mealAnalysisApi.addFoodItem(mealId, item);
      setFoodItems(prev => [...prev, result.foodItem]);
      setTotals(result.updatedTotals);
    } catch (err) {
      console.error('Failed to add food item:', err);
    }
  }, [mealId, setFoodItems, setTotals]);

  return { updateItem, deleteItem, addItem };
}
