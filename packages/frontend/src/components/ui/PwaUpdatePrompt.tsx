import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWAの新バージョン検知バナー。
 * registerType: 'prompt' のService Workerが新バージョンを検知すると
 * needRefresh が true になり、画面上部に更新を促すバナーを表示する。
 * 「更新」で新しいService Workerを有効化してリロード、「閉じる」で見送る。
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-blue-200 bg-blue-100 px-4 py-3 text-blue-800 shadow-lg"
      role="alert"
    >
      <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <p className="flex-1 text-sm font-medium">新しいバージョンがあります</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        更新
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="rounded p-1 hover:bg-black/10"
        aria-label="閉じる"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
