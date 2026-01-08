import { useEffect, useRef, useState, useCallback } from 'react';
import type { ExerciseImportSummary, RecentExerciseItem } from '@lifestyle-app/shared';
import { useExercisesByDate, useRecentExercises } from '../../hooks/useExercises';
import { ExerciseImportList } from './ExerciseImportList';
import { RecentExercises } from './RecentExercises';

interface ExerciseImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseImportSummary) => void;
  onSelectRecent?: (exercise: RecentExerciseItem) => void;
}

export function ExerciseImportDialog({
  isOpen,
  onClose,
  onSelect,
  onSelectRecent,
}: ExerciseImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [debouncedDate, setDebouncedDate] = useState<string>('');

  // Debounce date input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDate(selectedDate);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Fetch exercises for debounced date
  const { data: exercises = [], isLoading, error } = useExercisesByDate(debouncedDate);

  // Fetch recent exercises
  const { data: recentExercises = [], isLoading: isLoadingRecent } = useRecentExercises(10);

  // Manage dialog open/close state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today ?? '');
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle dialog close event (e.g., ESC key or backdrop click)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  const handleExerciseSelect = useCallback((exercise: ExerciseImportSummary) => {
    onSelect(exercise);
    onClose();
  }, [onSelect, onClose]);

  const handleRecentSelect = useCallback((exercise: RecentExerciseItem) => {
    if (onSelectRecent) {
      onSelectRecent(exercise);
    }
    onClose();
  }, [onSelectRecent, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg shadow-xl p-0 w-full max-w-lg backdrop:bg-black/50"
      aria-labelledby="import-dialog-title"
      aria-describedby="import-dialog-description"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
        <h2 id="import-dialog-title" className="text-lg font-semibold text-gray-900">
          過去のトレーニングから取り込む
        </h2>
        <button
          onClick={onClose}
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 bg-white rounded-b-lg max-h-[60vh] overflow-y-auto">
        {/* Hidden description for screen readers */}
        <p id="import-dialog-description" className="sr-only">
          最近のワークアウトまたは日付を選択してトレーニング内容を取り込むことができます
        </p>

        {/* Recent Exercises Section */}
        <div className="mb-6" role="region" aria-labelledby="recent-exercises-heading">
          <h3 id="recent-exercises-heading" className="text-sm font-medium text-gray-700 mb-2">
            最近のワークアウト
          </h3>
          <RecentExercises
            exercises={recentExercises}
            onSelect={handleRecentSelect}
            isLoading={isLoadingRecent}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">または</span>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-4" role="region" aria-labelledby="date-selection-heading">
          <label id="date-selection-heading" htmlFor="import-date" className="block text-sm font-medium text-gray-700 mb-2">
            日付を選択
          </label>
          <input
            type="date"
            id="import-date"
            value={selectedDate}
            onChange={handleDateChange}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-describedby="date-selection-help"
          />
          <span id="date-selection-help" className="sr-only">
            過去の日付を選択すると、その日のトレーニング記録が表示されます
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 mb-4" role="alert" aria-live="assertive">
            <p className="text-sm text-red-700">
              {error instanceof Error ? error.message : 'エラーが発生しました'}
            </p>
          </div>
        )}

        {/* Exercise List */}
        {selectedDate && (
          <div className="mt-4" role="region" aria-live="polite" aria-atomic="true">
            <p className="text-sm text-gray-600 mb-2">
              {selectedDate}のトレーニング
            </p>
            <ExerciseImportList
              exercises={exercises}
              onSelect={handleExerciseSelect}
              isLoading={isLoading}
            />
          </div>
        )}

        {!selectedDate && (
          <div className="text-center py-8 text-gray-500" role="status">
            日付を選択してください
          </div>
        )}
      </div>
    </dialog>
  );
}
