import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/client';
import { useRecentExercises } from '../../hooks/useExercises';
import { RecentExercises } from './RecentExercises';
import type { RecentExerciseItem } from '@lifestyle-app/shared';

interface SessionExercise {
  exerciseType: string;
  muscleGroup: string | null;
  sets: {
    setNumber: number;
    reps: number;
    weight: number | null;
    variation: string | null;
  }[];
}

interface Session {
  date: string;
  exercises: SessionExercise[];
}

interface SessionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (session: Session) => void;
}

export function SessionListModal({ isOpen, onClose, onSelect }: SessionListModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Fetch recent exercises
  const { data: recentExercises = [], isLoading: isLoadingRecent } = useRecentExercises(10);

  const fetchSessions = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const query: Record<string, string> = { limit: '10' };
      if (cursor) query['cursor'] = cursor;

      const res = await api.exercises.sessions.$get({ query });
      if (!res.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await res.json();

      if (cursor) {
        setSessions(prev => [...prev, ...data.sessions]);
      } else {
        setSessions(data.sessions);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      fetchSessions(nextCursor);
    }
  };

  const handleRecentSelect = useCallback(async (exercise: RecentExerciseItem) => {
    try {
      // Fetch detailed exercise records for the recent exercise
      // Use date-only format (YYYY-MM-DD) as expected by exerciseQuerySchema
      const targetDate = exercise.lastPerformedDate;

      console.log('[SessionListModal] Fetching exercise details:', {
        startDate: targetDate,
        endDate: targetDate,
        exerciseType: exercise.exerciseType,
      });

      const res = await api.exercises.$get({
        query: {
          startDate: targetDate,
          endDate: targetDate,
          exerciseType: exercise.exerciseType,
        },
      });

      console.log('[SessionListModal] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[SessionListModal] API error:', errorText);
        setError(`エクササイズの詳細の取得に失敗しました (${res.status})`);
        return;
      }

      const data = await res.json();
      const records = data.exercises;
      console.log('[SessionListModal] Fetched records:', records.length);

      if (records.length === 0) {
        setError('マッチする記録が見つかりませんでした');
        return;
      }

      // Find the most recent session (by recordedAt) for this exercise type
      const recordedAtTimes = [...new Set(records.map((r: typeof records[0]) => r.recordedAt))];
      const latestRecordedAt = recordedAtTimes.sort().reverse()[0];

      // Filter records for the latest session
      const sessionRecords = records.filter(
        (r: typeof records[0]) => r.recordedAt === latestRecordedAt
      );

      // Sort by setNumber and prepare session data
      const sortedRecords = sessionRecords.sort(
        (a: typeof records[0], b: typeof records[0]) => a.setNumber - b.setNumber
      );

      const session: Session = {
        date: exercise.lastPerformedDate,
        exercises: [{
          exerciseType: exercise.exerciseType,
          muscleGroup: exercise.muscleGroup,
          sets: sortedRecords.map((r: typeof records[0]) => ({
            setNumber: r.setNumber,
            reps: r.reps,
            weight: r.weight,
            variation: r.variation,
          })),
        }],
      };

      onSelect(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取り込み中にエラーが発生しました');
    }
  }, [onSelect, onClose]);

  const handleSessionClick = (session: Session) => {
    if (session.exercises.length === 1) {
      // Single exercise - import directly
      onSelect(session);
      onClose();
    } else {
      // Multiple exercises - show exercise selection view
      setSelectedSession(session);
    }
  };

  const handleExerciseSelect = (exercise: SessionExercise) => {
    if (!selectedSession) return;

    // Create a session with just the selected exercise
    const session: Session = {
      date: selectedSession.date,
      exercises: [exercise],
    };

    onSelect(session);
    onClose();
    setSelectedSession(null);
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  if (!isOpen) return null;

  // Show exercise selection view when a multi-exercise session is clicked
  if (selectedSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <button
              onClick={handleBackToSessions}
              className="text-gray-600 hover:text-gray-800 mr-2"
              aria-label="戻る"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 flex-1">
              種目を選択 - {formatDate(selectedSession.date)}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {selectedSession.exercises.map((exercise, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExerciseSelect(exercise)}
                  className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-medium text-gray-900">
                      {exercise.exerciseType}
                    </h3>
                    {exercise.muscleGroup && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {exercise.muscleGroup}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {exercise.sets.length}セット
                    {exercise.sets.length > 0 && (
                      <>
                        {' '}× {exercise.sets[0]?.reps}回
                        {exercise.sets[0]?.weight && ` @ ${exercise.sets[0].weight}kg`}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main session list view with recent exercises
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            過去のトレーニングから取り込む
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 mb-4" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Recent Exercises Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
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
              <span className="bg-white px-2 text-gray-500">または日付から選択</span>
            </div>
          </div>

          {/* Session List */}
          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              過去のトレーニング記録がありません
            </div>
          )}

          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.date}
                onClick={() => handleSessionClick(session)}
                className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {formatDate(session.date)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {session.exercises.length}種目
                    </span>
                    {session.exercises.length > 1 && (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {session.exercises.map((exercise, idx) => (
                    <span
                      key={idx}
                      className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
                    >
                      {exercise.exerciseType} ({exercise.sets.length}セット)
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Load More */}
          {nextCursor && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-orange-600 hover:text-orange-800 disabled:opacity-50"
              >
                {isLoading ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}

          {isLoading && sessions.length === 0 && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
