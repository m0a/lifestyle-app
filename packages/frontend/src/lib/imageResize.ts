/**
 * Downscale a photo and re-encode it as WebP before upload.
 *
 * Meal photos dominate R2 storage (the bucket averaged ~609KB per object while
 * still on 1920px JPEG). Two levers apply: the long edge, and the codec. WebP
 * is typically 25-35% smaller than JPEG at comparable quality, and 1280px still
 * leaves headroom for Gemini — whose effective image input is well below that —
 * while display never needs more than a phone-width card.
 *
 * Falls back to the original file whenever anything goes wrong, so a browser
 * without WebP encoding (or a decode failure) never blocks an upload.
 */

/** Long-edge cap. Above Gemini's effective input size, below the old 1920px. */
export const MAX_IMAGE_DIMENSION = 1280;

/** WebP quality. 0.80 keeps food detail while undercutting JPEG q0.85 markedly. */
export const IMAGE_QUALITY = 0.8;

const WEBP_MIME = 'image/webp';

/**
 * Whether canvas can actually encode WebP. Safari only gained this in 14, and
 * toBlob silently falls back to PNG for an unsupported type — which would make
 * files *larger*, so this is checked rather than assumed.
 */
function canEncodeWebP(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(WEBP_MIME).startsWith(`data:${WEBP_MIME}`);
  } catch {
    return false;
  }
}

export async function resizeImage(
  file: File,
  maxWidth: number = MAX_IMAGE_DIMENSION,
  maxHeight: number = MAX_IMAGE_DIMENSION,
  quality: number = IMAGE_QUALITY
): Promise<File> {
  // NOTE: deliberately no "small files pass through" shortcut. A 400KB JPEG is
  // still worth re-encoding, and skipping by size alone would leave the stored
  // format inconsistent for no benefit.
  try {
    const img = await createImageBitmap(file);
    const sourceWidth = img.width;
    const sourceHeight = img.height;

    // Preserve aspect ratio; never upscale.
    let width = sourceWidth;
    let height = sourceHeight;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, width, height);
    img.close();

    const useWebP = canEncodeWebP();
    const mimeType = useWebP ? WEBP_MIME : 'image/jpeg';
    const extension = useWebP ? '.webp' : '.jpg';

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });

    // Re-encoding can lose to the original on an already-optimised image that
    // needed no downscaling. Keeping the smaller of the two means this never
    // makes an upload heavier than it was.
    if (blob.size >= file.size && width === sourceWidth && height === sourceHeight) {
      return file;
    }

    return new File([blob], file.name.replace(/\.\w+$/, extension), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Failed to resize image, using original:', error);
    return file; // Fallback to original if resize fails
  }
}

/**
 * Resize multiple images in parallel
 */
export async function resizeImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => resizeImage(file)));
}
