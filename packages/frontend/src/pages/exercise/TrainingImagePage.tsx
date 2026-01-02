import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTrainingImage } from '../../hooks/useTrainingImage';
import { useShareImage } from '../../hooks/useShareImage';
import { TrainingImagePreview } from '../../components/exercise/TrainingImagePreview';
import { ShareButton } from '../../components/exercise/ShareButton';
import { SaveButton } from '../../components/exercise/SaveButton';

/**
 * Training image page - displays a preview of the training record image
 * with share and save functionality
 */
export function TrainingImagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get date from URL params (default to today)
  const dateParam = searchParams.get('date');
  const date = dateParam || new Date().toISOString().split('T')[0];

  // Ref for the image preview element
  const imageRef = useRef<HTMLDivElement>(null);

  // Fetch training data
  const { imageData, isLoading, error, hasExercises } = useTrainingImage({ date });

  // Share/save functionality
  const { shareImage, saveImage, isSharing, isSaving, error: shareError } = useShareImage();

  // Local error state for user feedback
  const [actionError, setActionError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!imageRef.current) return;
    setActionError(null);

    try {
      await shareImage(imageRef.current, `トレーニング記録 ${date}`);
    } catch {
      setActionError('共有に失敗しました。もう一度お試しください。');
    }
  };

  const handleSave = async () => {
    if (!imageRef.current) return;
    setActionError(null);

    try {
      await saveImage(imageRef.current, `training-${date}.png`);
    } catch {
      setActionError('保存に失敗しました。もう一度お試しください。');
    }
  };

  const handleBack = () => {
    navigate('/exercises');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">トレーニング記録を読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-red-700">データの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  if (!hasExercises) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-yellow-700">
            {date} のトレーニング記録がありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
        <h1 className="text-xl font-bold text-gray-900">画像プレビュー</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Error message */}
      {(actionError || shareError) && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{actionError || shareError?.message}</p>
        </div>
      )}

      {/* Image Preview */}
      <div className="flex justify-center overflow-x-auto pb-4">
        {imageData && (
          <TrainingImagePreview ref={imageRef} data={imageData} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 px-4">
        <ShareButton
          onClick={handleShare}
          isLoading={isSharing}
          disabled={isSaving}
        />
        <SaveButton
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isSharing}
        />
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-gray-500">
        「共有」でX/LINEなどに送信、「保存」で端末に保存できます
      </p>
    </div>
  );
}

export default TrainingImagePage;
