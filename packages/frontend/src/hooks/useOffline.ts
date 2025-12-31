import { useState, useEffect, useCallback } from 'react';
import {
  addPendingOperation,
  getCachedWeights,
  addCachedWeight,
  cacheWeights,
  getCachedMeals,
  addCachedMeal,
  cacheMeals,
  getCachedExercises,
  addCachedExercise,
  cacheExercises,
  generateId,
  type CachedWeight,
  type CachedMeal,
  type CachedExercise,
} from '../lib/offlineDb';
import { syncService } from '../services/sync';

// Hook to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Offline-aware weight operations
export function useOfflineWeights() {
  const isOnline = useOnlineStatus();
  const [localWeights, setLocalWeights] = useState<CachedWeight[]>([]);

  // Load cached weights on mount
  useEffect(() => {
    getCachedWeights().then(setLocalWeights);
  }, []);

  // Update cache when online data changes
  const updateCache = useCallback(async (weights: CachedWeight[]) => {
    await cacheWeights(weights);
    setLocalWeights(weights);
  }, []);

  // Create weight with offline support
  const createOffline = useCallback(
    async (data: { weight: number; recordedAt: string }) => {
      const id = generateId();
      const newWeight: CachedWeight = {
        id,
        weight: data.weight,
        recordedAt: data.recordedAt,
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      // Add to local cache immediately
      await addCachedWeight(newWeight);
      setLocalWeights((prev) => [newWeight, ...prev]);

      // Queue for sync
      await addPendingOperation({
        type: 'weight',
        action: 'create',
        data,
      });

      // Try to sync if online
      if (isOnline) {
        syncService.sync();
      }

      return newWeight;
    },
    [isOnline]
  );

  return {
    localWeights,
    updateCache,
    createOffline,
    isOnline,
  };
}

// Offline-aware meal operations
export function useOfflineMeals() {
  const isOnline = useOnlineStatus();
  const [localMeals, setLocalMeals] = useState<CachedMeal[]>([]);

  useEffect(() => {
    getCachedMeals().then(setLocalMeals);
  }, []);

  const updateCache = useCallback(async (meals: CachedMeal[]) => {
    await cacheMeals(meals);
    setLocalMeals(meals);
  }, []);

  const createOffline = useCallback(
    async (data: {
      mealType: string;
      description: string;
      calories?: number | null;
      recordedAt: string;
    }) => {
      const id = generateId();
      const newMeal: CachedMeal = {
        id,
        mealType: data.mealType,
        description: data.description,
        calories: data.calories ?? null,
        recordedAt: data.recordedAt,
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      await addCachedMeal(newMeal);
      setLocalMeals((prev) => [newMeal, ...prev]);

      await addPendingOperation({
        type: 'meal',
        action: 'create',
        data,
      });

      if (isOnline) {
        syncService.sync();
      }

      return newMeal;
    },
    [isOnline]
  );

  return {
    localMeals,
    updateCache,
    createOffline,
    isOnline,
  };
}

// Offline-aware exercise operations
export function useOfflineExercises() {
  const isOnline = useOnlineStatus();
  const [localExercises, setLocalExercises] = useState<CachedExercise[]>([]);

  useEffect(() => {
    getCachedExercises().then(setLocalExercises);
  }, []);

  const updateCache = useCallback(async (exercises: CachedExercise[]) => {
    await cacheExercises(exercises);
    setLocalExercises(exercises);
  }, []);

  const createOffline = useCallback(
    async (data: {
      exerciseType: string;
      durationMinutes: number;
      recordedAt: string;
    }) => {
      const id = generateId();
      const newExercise: CachedExercise = {
        id,
        exerciseType: data.exerciseType,
        durationMinutes: data.durationMinutes,
        recordedAt: data.recordedAt,
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      await addCachedExercise(newExercise);
      setLocalExercises((prev) => [newExercise, ...prev]);

      await addPendingOperation({
        type: 'exercise',
        action: 'create',
        data,
      });

      if (isOnline) {
        syncService.sync();
      }

      return newExercise;
    },
    [isOnline]
  );

  return {
    localExercises,
    updateCache,
    createOffline,
    isOnline,
  };
}
