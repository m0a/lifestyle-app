/**
 * Service Worker (workbox) のAPIレスポンスキャッシュを削除する。
 *
 * 共有端末やオフライン時に、前のユーザーの /api/* レスポンスが
 * 次のユーザーに表示されるのを防ぐため、ログアウト時に呼び出す。
 *
 * NOTE: 'api-cache' は vite.config.ts (workbox.runtimeCaching の cacheName)
 * で定義されている名前と一致させる必要がある。
 */
export async function clearApiCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete('api-cache');
  } catch {
    // best-effort: キャッシュ削除の失敗でログアウトを妨げない
  }
}
