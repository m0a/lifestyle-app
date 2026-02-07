import { useState, useCallback, useEffect } from 'react';
import type {
  FoodItem,
  NutritionTotals,
} from '@lifestyle-app/shared';
import { mealAnalysisApi, getPhotoUrl } from '../lib/api';
import { resizeImages } from '../lib/imageResize';

/**
 * Photo meal flow states:
 * idle → selecting → analyzing → reviewing → saving
 */
export type PhotoFlowState = 'idle' | 'selecting' | 'analyzing' | 'reviewing' | 'saving';

export interface AnalysisProgress {
  current: number;
  total: number;
  /** Per-photo status for detailed progress */
  statuses: Array<'pending' | 'analyzing' | 'done' | 'error'>;
}

export interface PhotoInfo {
  id: string;
  photoUrl: string;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'failed';
}

export interface PhotoMealFlowResult {
  mealId: string;
  foodItems: FoodItem[];
  totals: NutritionTotals;
  photoKey: string | null;
  photoUrls: string[];
  photoInfos: PhotoInfo[];
}

export interface UsePhotoMealFlowReturn {
  // State
  flowState: PhotoFlowState;
  photos: File[];
  photoPreviewUrls: string[];
  analysisProgress: AnalysisProgress | null;
  result: PhotoMealFlowResult | null;
  error: string | null;

  // Actions - Selecting phase
  openSelector: () => void;
  closeSelector: () => void;
  addPhotos: (files: FileList | null) => Promise<void>;
  removePhoto: (index: number) => void;

  // Actions - Analyzing phase
  startAnalysis: () => Promise<void>;

  // Actions - Reviewing phase (food item edits delegated to SmartMealInput callbacks)

  // Actions - Reset
  reset: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 10;

export function usePhotoMealFlow(): UsePhotoMealFlowReturn {
  const [flowState, setFlowState] = useState<PhotoFlowState>('idle');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [result, setResult] = useState<PhotoMealFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSelector = useCallback(() => {
    setFlowState('selecting');
    setError(null);
  }, []);

  const closeSelector = useCallback(() => {
    // Cleanup preview URLs
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
    setFlowState('idle');
    setError(null);
  }, [photoPreviewUrls]);

  const addPhotos = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setError('JPEG または PNG 形式の画像を選択してください');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('ファイルサイズは10MB以下にしてください');
        return;
      }
      validFiles.push(file);
    }

    // Check count before resizing (avoid unnecessary work)
    if (photos.length + validFiles.length > MAX_PHOTOS) {
      setError(`写真は最大${MAX_PHOTOS}枚までです`);
      return;
    }

    // Resize images
    const resizedFiles = await resizeImages(validFiles);

    // Create preview URLs
    const newPreviewUrls = resizedFiles.map(file => URL.createObjectURL(file));

    setPhotos(prev => [...prev, ...resizedFiles]);
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setError(null);
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotoPreviewUrls(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const startAnalysis = useCallback(async () => {
    if (photos.length === 0) {
      setError('少なくとも1枚の写真を選択してください');
      return;
    }

    setFlowState('analyzing');
    setError(null);

    const statuses: AnalysisProgress['statuses'] = photos.map(() => 'pending');
    setAnalysisProgress({ current: 0, total: photos.length, statuses });

    try {
      // 1. Analyze first photo - creates the meal
      statuses[0] = 'analyzing';
      setAnalysisProgress({ current: 0, total: photos.length, statuses: [...statuses] });

      const firstPhoto = photos[0];
      if (!firstPhoto) throw new Error('写真が選択されていません');

      // Convert File to Blob for analyzeMealPhoto
      const blob = new Blob([firstPhoto], { type: firstPhoto.type });
      const firstResult = await mealAnalysisApi.analyzeMealPhoto(blob);

      if ('error' in firstResult) {
        statuses[0] = 'error';
        setAnalysisProgress({ current: 0, total: photos.length, statuses: [...statuses] });
        setError(firstResult.message);
        setFlowState('selecting');
        return;
      }

      statuses[0] = 'done';
      setAnalysisProgress({ current: 1, total: photos.length, statuses: [...statuses] });

      let currentFoodItems = firstResult.foodItems;
      let currentTotals = firstResult.totals;
      const allPhotoUrls: string[] = [];

      if (firstResult.photoKey) {
        const url = getPhotoUrl(firstResult.photoKey);
        if (url) allPhotoUrls.push(url);
      }

      // 2. Add remaining photos one by one
      for (let i = 1; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo) continue;

        statuses[i] = 'analyzing';
        setAnalysisProgress({ current: i, total: photos.length, statuses: [...statuses] });

        try {
          const addResult = await mealAnalysisApi.addPhotoToMeal(firstResult.mealId, photo);
          statuses[i] = 'done';

          // Update totals from addPhotoToMeal response
          currentTotals = {
            calories: addResult.meal.calories,
            protein: addResult.meal.totalProtein,
            fat: addResult.meal.totalFat,
            carbs: addResult.meal.totalCarbs,
          };

          if (addResult.photo.photoUrl) {
            allPhotoUrls.push(addResult.photo.photoUrl);
          }
        } catch (err) {
          statuses[i] = 'error';
          // Continue with partial success
          console.error(`Failed to analyze photo ${i + 1}:`, err);
        }

        setAnalysisProgress({ current: i + 1, total: photos.length, statuses: [...statuses] });
      }

      // Fetch authoritative photo list and food items from server
      let photoInfos: PhotoInfo[] = [];
      try {
        const [foodItemsResult, photosResult] = await Promise.all([
          mealAnalysisApi.getFoodItems(firstResult.mealId),
          mealAnalysisApi.getMealPhotos(firstResult.mealId),
        ]);
        currentFoodItems = foodItemsResult.foodItems;
        currentTotals = photosResult.totals;
        photoInfos = photosResult.photos.map(p => ({
          id: p.id,
          photoUrl: p.photoUrl,
          analysisStatus: p.analysisStatus as PhotoInfo['analysisStatus'],
        }));
        // Use server photo URLs (presigned) instead of the ones collected during upload
        const serverPhotoUrls = photoInfos.map(p => p.photoUrl).filter(Boolean);
        if (serverPhotoUrls.length > 0) {
          allPhotoUrls.length = 0;
          allPhotoUrls.push(...serverPhotoUrls);
        }
      } catch {
        // Use food items/URLs collected during upload as fallback
      }

      // Check for failed analyses (server-side AI failures)
      const serverFailedCount = photoInfos.filter(p => p.analysisStatus === 'failed').length;
      const uploadFailedCount = statuses.filter(s => s === 'error').length;
      const totalFailedCount = serverFailedCount + uploadFailedCount;

      if (totalFailedCount > 0) {
        const totalSuccess = photoInfos.filter(p => p.analysisStatus === 'complete').length;
        if (totalSuccess === 0) {
          setError('写真の分析にすべて失敗しました。再分析をお試しください。');
        } else {
          setError(`${totalFailedCount}枚の分析に失敗しました。失敗した写真は再分析できます。`);
        }
      }

      setResult({
        mealId: firstResult.mealId,
        foodItems: currentFoodItems,
        totals: currentTotals,
        photoKey: firstResult.photoKey,
        photoUrls: allPhotoUrls,
        photoInfos,
      });

      setFlowState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setFlowState('selecting');
    } finally {
      setAnalysisProgress(null);
    }
  }, [photos]);

  const reset = useCallback(() => {
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
    setAnalysisProgress(null);
    setResult(null);
    setError(null);
    setFlowState('idle');
  }, [photoPreviewUrls]);

  return {
    flowState,
    photos,
    photoPreviewUrls,
    analysisProgress,
    result,
    error,
    openSelector,
    closeSelector,
    addPhotos,
    removePhoto,
    startAnalysis,
    reset,
  };
}
