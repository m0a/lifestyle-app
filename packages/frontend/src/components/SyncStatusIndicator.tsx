import { useSyncStatus } from '../services/sync';

export function SyncStatusIndicator() {
  const { status, pendingCount, isOnline, sync } = useSyncStatus();

  if (status === 'idle' && pendingCount === 0 && isOnline) {
    return null; // Nothing to show when everything is fine
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" data-testid="sync-status">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-800 shadow-lg">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <span>オフライン</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-800 shadow-lg">
          {status === 'syncing' ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>同期中...</span>
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {pendingCount}
              </span>
              <span>同期待ち</span>
              {isOnline && (
                <button
                  onClick={() => sync()}
                  className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
                >
                  今すぐ同期
                </button>
              )}
            </>
          )}
        </div>
      )}

      {status === 'error' && pendingCount === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800 shadow-lg">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>同期エラー</span>
          <button
            onClick={() => sync()}
            className="ml-2 rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
}
