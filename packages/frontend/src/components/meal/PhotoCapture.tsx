import { useRef, useState, useCallback } from 'react';
import { logError } from '../../lib/errorLogger';

interface PhotoCaptureProps {
  onCapture: (photo: Blob) => void;
  onCancel?: () => void;
  maxSize?: number; // Max dimension in pixels, default 1024
}

export function PhotoCapture({ onCapture, onCancel, maxSize = 1024 }: PhotoCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize image using Canvas API with memory management
  const resizeImage = useCallback(async (file: Blob, maxDimension: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      img.onload = () => {
        try {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);

          // Use OffscreenCanvas if available for better performance on mobile
          let canvas: HTMLCanvasElement | OffscreenCanvas;
          let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

          if (typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(width, height);
            ctx = canvas.getContext('2d');
          } else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            ctx = canvas.getContext('2d');
          }

          if (!ctx) {
            cleanup();
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          if (canvas instanceof OffscreenCanvas) {
            canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
              .then((blob) => {
                cleanup();
                resolve(blob);
              })
              .catch((err) => {
                cleanup();
                reject(err);
              });
          } else {
            canvas.toBlob(
              (blob) => {
                cleanup();
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to create blob'));
                }
              },
              'image/jpeg',
              0.8
            );
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const resized = await resizeImage(file, maxSize);
        onCapture(resized);
      } catch (err) {
        setError('画像の処理に失敗しました');
        const error = err instanceof Error ? err : new Error(String(err));
        logError(error, { component: 'PhotoCapture', action: 'handleFileSelect' });
      } finally {
        setIsProcessing(false);
      }
    },
    [maxSize, onCapture, resizeImage]
  );

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null);
    setIsVideoReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;

        // Multiple event handlers for better mobile compatibility
        const markReady = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setIsVideoReady(true);
            cleanup();
          }
        };

        const cleanup = () => {
          video.removeEventListener('playing', markReady);
          video.removeEventListener('loadeddata', markReady);
          video.removeEventListener('canplay', markReady);
        };

        // Try multiple events - different browsers fire different events
        video.addEventListener('playing', markReady);
        video.addEventListener('loadeddata', markReady);
        video.addEventListener('canplay', markReady);

        video.srcObject = stream;

        // Call play() and handle the promise
        video.play().catch((playErr) => {
          console.warn('Video autoplay failed:', playErr);
        });

        // Fallback: check periodically if video is ready
        let attempts = 0;
        const checkReady = setInterval(() => {
          attempts++;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setIsVideoReady(true);
            clearInterval(checkReady);
            cleanup();
          } else if (attempts > 50) {
            // 5 seconds timeout
            clearInterval(checkReady);
            cleanup();
            setError('カメラの初期化に失敗しました');
            logError(new Error('Video ready timeout'), {
              component: 'PhotoCapture',
              action: 'startCamera',
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
            });
          }
        }, 100);
      }
      setMode('camera');
    } catch (err) {
      setError('カメラにアクセスできません');
      const error = err instanceof Error ? err : new Error(String(err));
      logError(error, { component: 'PhotoCapture', action: 'startCamera' });
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsVideoReady(false);
    setMode('select');
  }, []);

  // Capture photo from camera
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const video = videoRef.current;

      // Wait for video to be ready if dimensions are not available
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video not ready')), 5000);
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      }

      // Double check dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video dimensions not available');
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.9
        );
      });

      const resized = await resizeImage(blob, maxSize);
      stopCamera();
      onCapture(resized);
    } catch (err) {
      setError('撮影に失敗しました');
      const error = err instanceof Error ? err : new Error(String(err));
      logError(error, { component: 'PhotoCapture', action: 'captureFromCamera' });
    } finally {
      setIsProcessing(false);
    }
  }, [maxSize, onCapture, resizeImage, stopCamera]);

  if (mode === 'camera') {
    return (
      <div className="flex flex-col items-center gap-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-md rounded-lg border"
        />
        <div className="flex gap-4">
          <button
            onClick={captureFromCamera}
            disabled={isProcessing || !isVideoReady}
            className="rounded-full bg-blue-500 p-4 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isProcessing ? '処理中...' : isVideoReady ? '撮影' : '準備中...'}
          </button>
          <button
            onClick={stopCamera}
            className="rounded-lg border px-4 py-2 hover:bg-gray-100"
          >
            キャンセル
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">食事の写真を追加</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded-lg border px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
        >
          <span>📁</span>
          <span>ファイルを選択</span>
        </button>

        <button
          onClick={startCamera}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded-lg border px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
        >
          <span>📷</span>
          <span>カメラで撮影</span>
        </button>
      </div>

      {isProcessing && <p className="text-sm text-gray-500">画像を処理中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </button>
      )}
    </div>
  );
}
