import { useRef, useState, useCallback } from 'react';
import { logError } from '../../lib/errorLogger';
import { resizeImage } from '../../lib/imageResize';

interface PhotoUploadButtonProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function PhotoUploadButton({
  onUpload,
  disabled = false,
  variant = 'primary'
}: PhotoUploadButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection with validation — shared by both camera and library inputs
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input to allow selecting same file again
      event.target.value = '';

      // T076: Validate file type (JPEG/PNG only)
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setError('JPEG または PNG 形式の画像を選択してください');
        return;
      }

      // Validate file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setError('ファイルサイズは10MB以下にしてください');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Resize image before uploading
        const resizedFile = await resizeImage(file);
        onUpload(resizedFile);
      } catch (err) {
        setError('アップロードに失敗しました');
        const error = err instanceof Error ? err : new Error(String(err));
        logError(error, { component: 'PhotoUploadButton', action: 'handleFileSelect' });
      } finally {
        setIsProcessing(false);
      }
    },
    [onUpload]
  );

  const baseClasses = 'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  // Camera button follows the variant; library button stays neutral (bordered)
  const cameraClasses = variant === 'primary'
    ? 'bg-blue-500 text-white hover:bg-blue-600'
    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
  const libraryClasses = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';

  return (
    <div className="flex flex-col gap-2">
      {/* Camera input: capture 属性でカメラを直接起動 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Library input: capture なしでフォトライブラリ/ギャラリーを開く */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={`${baseClasses} ${cameraClasses}`}
          type="button"
        >
          <span>📷</span>
          <span>カメラ</span>
        </button>
        <button
          onClick={() => libraryInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={`${baseClasses} ${libraryClasses}`}
          type="button"
        >
          <span>📁</span>
          <span>ライブラリ</span>
        </button>
      </div>

      {isProcessing && (
        <p className="text-sm text-gray-500">⏳ 処理中...</p>
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
