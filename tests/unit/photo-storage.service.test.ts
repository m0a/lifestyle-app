import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoStorageService } from '../../packages/backend/src/services/photo-storage';

// Mock R2Bucket
const createMockR2Bucket = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('PhotoStorageService', () => {
  let mockR2: ReturnType<typeof createMockR2Bucket>;
  let service: PhotoStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockR2 = createMockR2Bucket();
    service = new PhotoStorageService(mockR2 as unknown as R2Bucket);
  });

  describe('uploadForAnalysis', () => {
    it('should upload photo with temp prefix', async () => {
      const imageData = new ArrayBuffer(100);
      const mimeType = 'image/jpeg';

      const key = await service.uploadForAnalysis(imageData, mimeType);

      expect(key).toMatch(/^temp\//);
      expect(mockR2.put).toHaveBeenCalledWith(
        expect.stringMatching(/^temp\//),
        imageData,
        { httpMetadata: { contentType: mimeType } }
      );
    });

    it('should generate unique keys for each upload', async () => {
      const imageData = new ArrayBuffer(100);
      const mimeType = 'image/png';

      const key1 = await service.uploadForAnalysis(imageData, mimeType);
      const key2 = await service.uploadForAnalysis(imageData, mimeType);

      // Keys should be different (due to UUID)
      expect(key1).not.toBe(key2);
    });
  });

  describe('getPhotoForAnalysis', () => {
    it('should return photo data and mime type', async () => {
      const mockData = new ArrayBuffer(100);
      mockR2.get.mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(mockData),
        httpMetadata: { contentType: 'image/jpeg' },
      });

      const result = await service.getPhotoForAnalysis('temp/test-key');

      expect(result).not.toBeNull();
      expect(result?.data).toBe(mockData);
      expect(result?.mimeType).toBe('image/jpeg');
    });

    it('should return null if photo not found', async () => {
      mockR2.get.mockResolvedValueOnce(null);

      const result = await service.getPhotoForAnalysis('temp/nonexistent');

      expect(result).toBeNull();
    });

    it('should default to image/jpeg if no content type', async () => {
      mockR2.get.mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        httpMetadata: {},
      });

      const result = await service.getPhotoForAnalysis('temp/test-key');

      expect(result?.mimeType).toBe('image/jpeg');
    });
  });

  describe('saveForRecord', () => {
    it('should copy photo from temp to permanent location', async () => {
      const mockData = new ArrayBuffer(100);
      mockR2.get.mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(mockData),
        httpMetadata: { contentType: 'image/jpeg' },
      });

      const permanentKey = await service.saveForRecord('temp/temp-key', 'meal-123');

      expect(permanentKey).toBe('meals/meal-123/photo.jpg');
      expect(mockR2.put).toHaveBeenCalledWith(
        'meals/meal-123/photo.jpg',
        mockData,
        { httpMetadata: { contentType: 'image/jpeg' } }
      );
    });

    it('should delete temp photo after saving', async () => {
      mockR2.get.mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        httpMetadata: { contentType: 'image/jpeg' },
      });

      await service.saveForRecord('temp/temp-key', 'meal-123');

      expect(mockR2.delete).toHaveBeenCalledWith('temp/temp-key');
    });

    it('should throw error if temp photo not found', async () => {
      mockR2.get.mockResolvedValueOnce(null);

      await expect(service.saveForRecord('temp/missing', 'meal-123'))
        .rejects.toThrow('Temporary photo not found');
    });
  });

  describe('deleteForRecord', () => {
    it('should delete photo at meal location', async () => {
      await service.deleteForRecord('meal-123');

      expect(mockR2.delete).toHaveBeenCalledWith('meals/meal-123/photo.jpg');
    });
  });

  describe('deleteTempPhoto', () => {
    it('should delete photo with temp prefix', async () => {
      await service.deleteTempPhoto('temp/test-key');

      expect(mockR2.delete).toHaveBeenCalledWith('temp/test-key');
    });

    it('should not delete non-temp photos', async () => {
      await service.deleteTempPhoto('meals/meal-123/photo.jpg');

      expect(mockR2.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPhotoUrl', () => {
    it('should return API path for photo', async () => {
      const url = await service.getPhotoUrl('meals/meal-123/photo.jpg');

      expect(url).toBe('/api/photos/meals%2Fmeal-123%2Fphoto.jpg');
    });
  });

  describe('getPhotoForServing', () => {
    it('should return photo data for permanent photos', async () => {
      const mockData = new ArrayBuffer(100);
      mockR2.get.mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(mockData),
        httpMetadata: { contentType: 'image/jpeg' },
      });

      const result = await service.getPhotoForServing('meals/meal-123/photo.jpg');

      expect(result).not.toBeNull();
      expect(result?.data).toBe(mockData);
    });

    it('should reject temp photos for security', async () => {
      const result = await service.getPhotoForServing('temp/temp-key');

      expect(result).toBeNull();
      expect(mockR2.get).not.toHaveBeenCalled();
    });
  });
});
