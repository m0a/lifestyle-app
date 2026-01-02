import { toPng } from 'html-to-image';

/**
 * iOS Safari workaround: html-to-image may fail on first attempt
 * This function retries the image generation with delays
 */
const RETRY_DELAY_MS = 100;
const MAX_RETRIES = 3;

/**
 * Generate a PNG image from an HTML element
 * Includes retry logic for iOS Safari compatibility
 *
 * @param element - The HTML element to capture
 * @param pixelRatio - Resolution multiplier (default: 2 for retina)
 * @returns Promise resolving to image Blob
 */
export async function generateImageBlob(
  element: HTMLElement,
  pixelRatio = 2
): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Generate data URL from element
      const dataUrl = await toPng(element, {
        pixelRatio,
        // Ensure background is captured
        backgroundColor: '#ffffff',
        // Cache bust to avoid stale images
        cacheBust: true,
      });

      // Convert data URL to Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      return blob;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw new Error(`Image generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Generate a PNG image as a data URL from an HTML element
 * Useful for preview purposes
 *
 * @param element - The HTML element to capture
 * @param pixelRatio - Resolution multiplier (default: 2 for retina)
 * @returns Promise resolving to data URL string
 */
export async function generateImageDataUrl(
  element: HTMLElement,
  pixelRatio = 2
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const dataUrl = await toPng(element, {
        pixelRatio,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      return dataUrl;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw new Error(`Image generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
