/**
 * Resize image to maximum dimensions while preserving aspect ratio
 * Converts to JPEG with quality compression
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<File> {
  // If already small enough, return as-is
  if (file.size < 500 * 1024) {
    // Less than 500KB, no need to resize
    return file;
  }

  try {
    // Create image bitmap from file
    const img = await createImageBitmap(file);

    // Calculate new dimensions preserving aspect ratio
    let { width, height } = img;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    // Convert blob to File
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
      type: 'image/jpeg',
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
