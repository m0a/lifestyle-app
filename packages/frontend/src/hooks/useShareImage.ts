import { useCallback, useState } from 'react';
import { generateImageBlob } from '../lib/image-generator';

interface UseShareImageResult {
  /** Generate and share an image from an HTML element */
  shareImage: (element: HTMLElement, title?: string) => Promise<void>;
  /** Save/download an image from an HTML element */
  saveImage: (element: HTMLElement, filename?: string) => Promise<void>;
  /** Whether share is in progress */
  isSharing: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Whether Web Share API with files is supported */
  canShare: boolean;
}

/**
 * Hook for sharing and saving training images
 * Uses Web Share API with fallback to download
 */
export function useShareImage(): UseShareImageResult {
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if Web Share API with file support is available
  const canShare = typeof navigator !== 'undefined' &&
    'share' in navigator &&
    'canShare' in navigator;

  /**
   * Download an image blob as a file
   */
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Share an image using Web Share API or fallback to download
   */
  const shareImage = useCallback(async (element: HTMLElement, title = 'トレーニング記録') => {
    setIsSharing(true);
    setError(null);

    try {
      const blob = await generateImageBlob(element);
      const file = new File([blob], 'training-record.png', { type: 'image/png' });
      const shareData = { files: [file], title };

      // Check if we can share files
      if (canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (shareError) {
          // User cancelled - not an error
          if ((shareError as Error).name === 'AbortError') {
            return;
          }
          // Fall back to download on other errors
          downloadBlob(blob, 'training-record.png');
        }
      } else {
        // Web Share not available - fall back to download
        downloadBlob(blob, 'training-record.png');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, [canShare, downloadBlob]);

  /**
   * Save an image to the device (download)
   */
  const saveImage = useCallback(async (element: HTMLElement, filename = 'training-record.png') => {
    setIsSaving(true);
    setError(null);

    try {
      const blob = await generateImageBlob(element);
      downloadBlob(blob, filename);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [downloadBlob]);

  return {
    shareImage,
    saveImage,
    isSharing,
    isSaving,
    error,
    canShare,
  };
}
