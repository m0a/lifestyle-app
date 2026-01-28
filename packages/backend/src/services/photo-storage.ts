import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

export class PhotoStorageService {
  constructor(private r2: R2Bucket) {}

  /**
   * Upload photo for AI analysis (temporary storage).
   * This photo will be deleted after analysis.
   */
  async uploadForAnalysis(file: ArrayBuffer, mimeType: string): Promise<string> {
    const key = `temp/${uuidv4()}`;
    await this.r2.put(key, file, {
      httpMetadata: {
        contentType: mimeType,
      },
    });
    return key;
  }

  /**
   * Get photo data for AI analysis.
   */
  async getPhotoForAnalysis(key: string): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
    const object = await this.r2.get(key);
    if (!object) {
      return null;
    }
    const data = await object.arrayBuffer();
    const mimeType = object.httpMetadata?.contentType || 'image/jpeg';
    return { data, mimeType };
  }

  /**
   * Save photo permanently for meal record.
   * The photo is stored at: photos/{userId}/{mealId}/{photoId}.jpg
   */
  async saveForRecord(tempKey: string, mealId: string, userId: string): Promise<string> {
    const tempObject = await this.r2.get(tempKey);
    if (!tempObject) {
      throw new Error('Temporary photo not found');
    }

    const data = await tempObject.arrayBuffer();
    const mimeType = tempObject.httpMetadata?.contentType || 'image/jpeg';
    const photoId = nanoid();
    const permanentKey = `photos/${userId}/${mealId}/${photoId}.jpg`;

    await this.r2.put(permanentKey, data, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    // Delete temporary file
    await this.r2.delete(tempKey);

    return permanentKey;
  }

  /**
   * Delete photo by key.
   */
  async deletePhoto(key: string): Promise<void> {
    await this.r2.delete(key);
  }

  /**
   * Delete temporary photo (used when analysis fails or is cancelled).
   */
  async deleteTempPhoto(key: string): Promise<void> {
    if (key.startsWith('temp/')) {
      await this.r2.delete(key);
    }
  }

  /**
   * Get a signed URL for accessing the photo.
   * Note: R2 doesn't support signed URLs directly in Workers.
   * For public access, use R2 public bucket or serve through Worker.
   */
  async getPhotoUrl(key: string): Promise<string> {
    // In production, you'd either:
    // 1. Use a public R2 bucket with custom domain
    // 2. Create a Worker endpoint to serve photos
    // For now, we return a placeholder that can be handled by a route
    return `/api/meals/photos/${encodeURIComponent(key)}`;
  }

  /**
   * Get photo for serving (used by the photo serving endpoint).
   * Returns body as ReadableStream for efficient streaming.
   */
  async getPhotoForServing(key: string): Promise<{ body: ReadableStream; contentType: string } | null> {
    const object = await this.r2.get(key);
    if (!object || !object.body) {
      return null;
    }
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || 'image/jpeg',
    };
  }

  /**
   * Upload photo directly to permanent storage.
   * Used for multi-photo meals.
   */
  async uploadPhoto(photoKey: string, file: File | ArrayBuffer): Promise<void> {
    const data = file instanceof File ? await file.arrayBuffer() : file;
    const mimeType = file instanceof File ? file.type : 'image/jpeg';

    await this.r2.put(photoKey, data, {
      httpMetadata: {
        contentType: mimeType,
      },
    });
  }

  /**
   * Get presigned URL for photo (1 hour expiry).
   * Note: R2 doesn't support presigned URLs in Workers, so we use Worker endpoint.
   */
  async getPresignedUrl(photoKey: string): Promise<string> {
    // In production with custom domain: return actual R2 URL
    // For now: return Worker endpoint that serves the photo
    return `/api/meals/photos/${encodeURIComponent(photoKey)}`;
  }
}
