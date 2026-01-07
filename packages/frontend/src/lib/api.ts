// In production (empty VITE_API_URL), use same origin
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl === '' || envUrl === undefined) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:8787';
  }
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Export function to get full URL for resources like photos
export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// Get photo URL for meal photos
export function getPhotoUrl(photoKey: string | null): string | null {
  if (!photoKey) return null;
  return getApiUrl(`/api/meals/photos/${encodeURIComponent(photoKey)}`);
}

interface ApiError {
  message: string;
  code?: string;
  errors?: Array<{ path: string; message: string }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'エラーが発生しました',
      })) as ApiError;
      throw new ApiRequestError(error.message, response.status, error.code, error.errors);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api;

// Meal Analysis API
import type {
  FoodItem,
  NutritionTotals,
  AnalysisResult,
  AnalysisFailure,
  ChatMessage,
  ChatChange,
  MealType,
  CreateFoodItem,
  UpdateFoodItem,
  TextAnalysisRequest,
  TextAnalysisResponse,
  TextAnalysisError,
} from '@lifestyle-app/shared';

export interface MealAnalysisResponse extends AnalysisResult {}

export interface MealChatEvent {
  text?: string;
  done?: boolean;
  messageId?: string;
  changes?: ChatChange[];
  error?: string;
}

export const mealAnalysisApi = {
  // Analyze meal from text input with 30s timeout (T008)
  async analyzeText(
    request: TextAnalysisRequest,
    signal?: AbortSignal
  ): Promise<TextAnalysisResponse | TextAnalysisError> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/meals/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        credentials: 'include',
        signal: signal || controller.signal,
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        if (response.status === 422) {
          return error as TextAnalysisError;
        }
        throw new ApiRequestError(error.message || 'Analysis failed', response.status);
      }

      return response.json();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          error: 'timeout',
          message: 'タイムアウトしました。手動で入力してください。',
        } as TextAnalysisError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // Analyze meal photo
  async analyzeMealPhoto(photo: Blob): Promise<MealAnalysisResponse | AnalysisFailure> {
    const formData = new FormData();
    formData.append('photo', photo, 'photo.jpg');

    const response = await fetch(`${API_BASE_URL}/api/meals/analyze`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      if (response.status === 422) {
        return error as AnalysisFailure;
      }
      throw new ApiRequestError(error.message || 'Analysis failed', response.status);
    }

    return response.json();
  },

  // Create empty meal for manual input
  async createEmptyMeal(): Promise<{ mealId: string }> {
    return api.post('/api/meals/create-empty');
  },

  // Get food items for a meal
  async getFoodItems(mealId: string): Promise<{ foodItems: FoodItem[] }> {
    return api.get(`/api/meals/${mealId}/food-items`);
  },

  // Add food item
  async addFoodItem(
    mealId: string,
    item: CreateFoodItem
  ): Promise<{ foodItem: FoodItem; updatedTotals: NutritionTotals }> {
    return api.post(`/api/meals/${mealId}/food-items`, item);
  },

  // Update food item
  async updateFoodItem(
    mealId: string,
    foodItemId: string,
    updates: UpdateFoodItem
  ): Promise<{ foodItem: FoodItem; updatedTotals: NutritionTotals }> {
    return api.patch(`/api/meals/${mealId}/food-items/${foodItemId}`, updates);
  },

  // Delete food item
  async deleteFoodItem(
    mealId: string,
    foodItemId: string
  ): Promise<{ message: string; updatedTotals: NutritionTotals }> {
    return api.delete(`/api/meals/${mealId}/food-items/${foodItemId}`);
  },

  // Save meal analysis
  async saveMealAnalysis(
    mealId: string,
    mealType: MealType,
    recordedAt?: string
  ): Promise<{ meal: unknown }> {
    return api.post(`/api/meals/${mealId}/save`, { mealType, recordedAt });
  },

  // Create meal with multiple photos (T061)
  async createMealWithPhotos(data: {
    mealType: MealType;
    content: string;
    recordedAt: string;
    photos: File[];
  }): Promise<{
    meal: {
      id: string;
      calories: number;
      totalProtein: number;
      totalFat: number;
      totalCarbs: number;
    };
    photos: Array<{
      id: string;
      photoUrl: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('mealType', data.mealType);
    formData.append('content', data.content);
    formData.append('recordedAt', data.recordedAt);

    // Append each photo with array notation
    data.photos.forEach((photo, index) => {
      formData.append(`photos[${index}]`, photo);
    });

    const response = await fetch(`${API_BASE_URL}/api/meals`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new ApiRequestError(error.message || 'Failed to create meal', response.status);
    }

    return response.json();
  },

  // Get chat history
  async getChatHistory(mealId: string): Promise<{ messages: ChatMessage[] }> {
    return api.get(`/api/meals/${mealId}/chat`);
  },

  // Send chat message (streaming)
  async *sendChatMessage(mealId: string, message: string): AsyncGenerator<MealChatEvent> {
    const response = await fetch(`${API_BASE_URL}/api/meals/${mealId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new ApiRequestError(error.message || 'Chat failed', response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6)) as MealChatEvent;
            yield event;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  },

  // Apply chat suggestion (includes food item, date/time, and meal type changes)
  async applyChatSuggestion(
    mealId: string,
    changes: ChatChange[]
  ): Promise<{ foodItems: FoodItem[]; updatedTotals: NutritionTotals; recordedAt?: string; mealType?: MealType }> {
    return api.post(`/api/meals/${mealId}/chat/apply`, { changes });
  },

  // Delete meal photo (T034)
  async deletePhoto(mealId: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/api/meals/${mealId}/photo`);
  },

  // Upload meal photo (T035)
  async uploadPhoto(
    mealId: string,
    photo: Blob
  ): Promise<{ success: boolean; photoKey: string; message: string }> {
    const formData = new FormData();
    formData.append('photo', photo, 'photo.jpg');

    const response = await fetch(`${API_BASE_URL}/api/meals/${mealId}/photo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new ApiRequestError(error.message || 'Photo upload failed', response.status);
    }

    return response.json();
  },

  // Add photo to existing meal (POST /api/meals/:id/photos)
  async addPhotoToMeal(
    mealId: string,
    photo: File
  ): Promise<{ photo: { id: string; photoUrl: string }; meal: { calories: number; totalProtein: number; totalFat: number; totalCarbs: number } }> {
    const formData = new FormData();
    formData.append('photo', photo);

    const response = await fetch(`${API_BASE_URL}/api/meals/${mealId}/photos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new ApiRequestError(error.message || 'Failed to add photo', response.status);
    }

    return response.json();
  },

  // Create meal with single photo (for first photo in multi-photo mode)
  async createMealWithPhoto(data: {
    mealType: MealType;
    content: string;
    recordedAt: string;
    photo: File;
  }): Promise<{
    meal: {
      id: string;
      calories: number;
      totalProtein: number;
      totalFat: number;
      totalCarbs: number;
    };
    photos: Array<{
      id: string;
      photoUrl: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('mealType', data.mealType);
    formData.append('content', data.content);
    formData.append('recordedAt', data.recordedAt);
    formData.append('photos[0]', data.photo);

    const response = await fetch(`${API_BASE_URL}/api/meals`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new ApiRequestError(error.message || 'Failed to create meal', response.status);
    }

    return response.json();
  },
};
