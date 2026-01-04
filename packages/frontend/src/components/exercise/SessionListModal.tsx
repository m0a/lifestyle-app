import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/client';

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
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              過去のトレーニング記録がありません
            </div>
          )}

          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.date}
                onClick={() => {
                  onSelect(session);
                  onClose();
                }}
                className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {formatDate(session.date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {session.exercises.length}種目
                  </span>
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
