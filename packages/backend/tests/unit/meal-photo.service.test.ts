import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MealPhotoService } from '../../src/services/meal-photo.service';
import type { Database } from '../../src/db';
import type { MealPhoto } from '../../src/db/schema';

// Mock database
const mockDb = {
  query: {
    mealPhotos: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(),
  delete: vi.fn(),
} as unknown as Database;

describe('MealPhotoService', () => {
  let service: MealPhotoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MealPhotoService(mockDb);
  });

  describe('getMealPhotos', () => {
    it('should return photos ordered by displayOrder', async () => {
      const mockPhotos: MealPhoto[] = [
        {
          id: 'photo1',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo1.jpg',
          displayOrder: 0,
          analysisStatus: 'complete',
          calories: 100,
          protein: 10,
          fat: 5,
          carbs: 15,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo2',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo2.jpg',
          displayOrder: 1,
          analysisStatus: 'pending',
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
          createdAt: new Date().toISOString(),
        },
      ];

      mockDb.query.mealPhotos.findMany = vi.fn().mockResolvedValue(mockPhotos);

      const result = await service.getMealPhotos('meal1');

      expect(result).toEqual(mockPhotos);
      expect(result).toHaveLength(2);
    });
  });

  describe('addPhoto', () => {
    it('should add photo with correct displayOrder', async () => {
      const existingPhotos: MealPhoto[] = [
        {
          id: 'photo1',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo1.jpg',
          displayOrder: 0,
          analysisStatus: 'complete',
          calories: 100,
          protein: 10,
          fat: 5,
          carbs: 15,
          createdAt: new Date().toISOString(),
        },
      ];

      mockDb.query.mealPhotos.findMany = vi.fn().mockResolvedValue(existingPhotos);

      const newPhoto: MealPhoto = {
        id: 'photo2',
        mealId: 'meal1',
        photoKey: 'photos/user1/meal1/photo2.jpg',
        displayOrder: 1,
        analysisStatus: 'pending',
        calories: null,
        protein: null,
        fat: null,
        carbs: null,
        createdAt: new Date().toISOString(),
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newPhoto]),
      };

      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      const result = await service.addPhoto({
        mealId: 'meal1',
        photoKey: 'photos/user1/meal1/photo2.jpg',
      });

      expect(result.displayOrder).toBe(1);
      expect(result.analysisStatus).toBe('pending');
    });

    it('should throw error when meal has 10 photos', async () => {
      const existingPhotos: MealPhoto[] = Array.from({ length: 10 }, (_, i) => ({
        id: `photo${i}`,
        mealId: 'meal1',
        photoKey: `photos/user1/meal1/photo${i}.jpg`,
        displayOrder: i,
        analysisStatus: 'complete',
        calories: 100,
        protein: 10,
        fat: 5,
        carbs: 15,
        createdAt: new Date().toISOString(),
      }));

      mockDb.query.mealPhotos.findMany = vi.fn().mockResolvedValue(existingPhotos);

      await expect(
        service.addPhoto({
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo11.jpg',
        })
      ).rejects.toThrow('Maximum 10 photos per meal');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      const photo: MealPhoto = {
        id: 'photo2',
        mealId: 'meal1',
        photoKey: 'photos/user1/meal1/photo2.jpg',
        displayOrder: 1,
        analysisStatus: 'complete',
        calories: 100,
        protein: 10,
        fat: 5,
        carbs: 15,
        createdAt: new Date().toISOString(),
      };

      const remainingPhotos: MealPhoto[] = [
        {
          id: 'photo1',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo1.jpg',
          displayOrder: 0,
          analysisStatus: 'complete',
          calories: 100,
          protein: 10,
          fat: 5,
          carbs: 15,
          createdAt: new Date().toISOString(),
        },
        photo,
      ];

      mockDb.query.mealPhotos.findFirst = vi.fn().mockResolvedValue(photo);
      mockDb.query.mealPhotos.findMany = vi.fn().mockResolvedValue(remainingPhotos);

      const mockDelete = vi.fn().mockResolvedValue(undefined);
      mockDb.delete = vi.fn().mockReturnValue({ where: mockDelete });

      const result = await service.deletePhoto('photo2');

      expect(result.photoKey).toBe('photos/user1/meal1/photo2.jpg');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw error when deleting last photo', async () => {
      const photo: MealPhoto = {
        id: 'photo1',
        mealId: 'meal1',
        photoKey: 'photos/user1/meal1/photo1.jpg',
        displayOrder: 0,
        analysisStatus: 'complete',
        calories: 100,
        protein: 10,
        fat: 5,
        carbs: 15,
        createdAt: new Date().toISOString(),
      };

      mockDb.query.mealPhotos.findFirst = vi.fn().mockResolvedValue(photo);
      mockDb.query.mealPhotos.findMany = vi.fn().mockResolvedValue([photo]);

      await expect(service.deletePhoto('photo1')).rejects.toThrow(
        'Meals must have at least one photo'
      );
    });
  });

  describe('calculateTotals', () => {
    it('should calculate totals from complete photos only', () => {
      const photos: MealPhoto[] = [
        {
          id: 'photo1',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo1.jpg',
          displayOrder: 0,
          analysisStatus: 'complete',
          calories: 100,
          protein: 10,
          fat: 5,
          carbs: 15,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo2',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo2.jpg',
          displayOrder: 1,
          analysisStatus: 'complete',
          calories: 200,
          protein: 20,
          fat: 10,
          carbs: 30,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo3',
          mealId: 'meal1',
          photoKey: 'photos/user1/meal1/photo3.jpg',
          displayOrder: 2,
          analysisStatus: 'pending',
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
          createdAt: new Date().toISOString(),
        },
      ];

      const totals = service.calculateTotals(photos);

      expect(totals.calories).toBe(300);
      expect(totals.protein).toBe(30);
      expect(totals.fat).toBe(15);
      expect(totals.carbs).toBe(45);
      expect(totals.photoCount).toBe(3);
      expect(totals.analyzedPhotoCount).toBe(2);
    });

    it('should handle empty photo array', () => {
      const totals = service.calculateTotals([]);

      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.fat).toBe(0);
      expect(totals.carbs).toBe(0);
      expect(totals.photoCount).toBe(0);
      expect(totals.analyzedPhotoCount).toBe(0);
    });
  });
});
