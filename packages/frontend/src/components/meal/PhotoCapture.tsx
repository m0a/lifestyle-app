import { useRef, useState, useCallback } from 'react';
import { logError } from '../../lib/errorLogger';
import { resizeImage } from '../../lib/imageResize';

interface PhotoCaptureProps {
  onCapture: (photo: Blob) => void;
  onCancel?: () => void;
}

export function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Resize image using shared utility (max 1920x1920, quality 0.85)
        const resizedFile = await resizeImage(file);
        // Convert File to Blob for onCapture
        const blob = new Blob([resizedFile], { type: resizedFile.type });
        onCapture(blob);
      } catch (err) {
        setError('画像の処理に失敗しました');
        const error = err instanceof Error ? err : new Error(String(err));
        logError(error, { component: 'PhotoCapture', action: 'handleFileSelect' });
      } finally {
        setIsProcessing(false);
      }
    },
    [onCapture]
  );

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">食事の写真を追加</h3>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Native camera input for mobile - more reliable than getUserMedia */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id="camera-input"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {/* Primary: Native camera (works best on mobile) */}
        <label
          htmlFor="camera-input"
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600 ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
        >
          <span>📷</span>
          <span>カメラで撮影</span>
        </label>

        {/* Secondary: File picker */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 rounded-lg border px-4 py-3 hover:bg-gray-100 disabled:opacity-50"
        >
          <span>📁</span>
          <span>ライブラリから選択</span>
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
