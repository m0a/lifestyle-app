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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection with validation
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input to allow selecting same file again
      event.target.value = '';

      // T076: Validate file type (JPEG/PNG only)
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
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

  const baseClasses = 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = variant === 'primary'
    ? 'bg-blue-500 text-white hover:bg-blue-600'
    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isProcessing}
        className={`${baseClasses} ${variantClasses}`}
        type="button"
      >
        <span>{isProcessing ? '⏳' : '📷'}</span>
        <span>{isProcessing ? '処理中...' : '写真を追加'}</span>
      </button>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
