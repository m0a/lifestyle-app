import { useRef } from 'react';

interface UnifiedPhotoSelectorProps {
  photos: File[];
  photoPreviewUrls: string[];
  error: string | null;
  onAddPhotos: (files: FileList | null) => Promise<void>;
  onRemovePhoto: (index: number) => void;
  onStartAnalysis: () => void;
  onCancel: () => void;
}

const MAX_PHOTOS = 10;

export function UnifiedPhotoSelector({
  photos,
  photoPreviewUrls,
  error,
  onAddPhotos,
  onRemovePhoto,
  onStartAnalysis,
  onCancel,
}: UnifiedPhotoSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">食事の写真を追加</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={(e) => {
            onAddPhotos(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          capture="environment"
          onChange={(e) => {
            onAddPhotos(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Photo selection buttons */}
        {photos.length < MAX_PHOTOS && (
          <div className="mb-4 flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600"
            >
              <span>📷</span>
              <span>カメラで撮影</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 hover:bg-gray-50"
            >
              <span>📁</span>
              <span>ライブラリ</span>
            </button>
          </div>
        )}

        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={url}
                  alt={`写真 ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  onClick={() => onRemovePhoto(index)}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-xs text-white hover:bg-red-600"
                  aria-label={`写真${index + 1}を削除`}
                >
                  ✕
                </button>
                <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo count */}
        {photos.length > 0 && (
          <p className="mb-3 text-sm text-gray-500">
            {photos.length}/{MAX_PHOTOS} 枚選択中
          </p>
        )}

        {/* Error message */}
        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onStartAnalysis}
            disabled={photos.length === 0}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            分析へ進む ({photos.length}枚)
          </button>
        </div>
      </div>
    </div>
  );
}
