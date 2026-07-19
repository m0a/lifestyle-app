import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api } from '../../lib/client';
import { useToast } from '../ui/Toast';

interface IssuedToken {
  token: string;
  command: string;
}

/**
 * MCP access token management.
 *
 * Issuing a token requires a fresh passkey step-up (the backend verifies a live
 * WebAuthn assertion before minting). The raw token is shown exactly once, along
 * with a ready-to-paste `claude mcp add` command; afterwards only its prefix is
 * visible. Tokens are individually revocable.
 */
export function McpTokenManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const isSupported = browserSupportsWebAuthn();

  const { data, isLoading } = useQuery({
    queryKey: ['mcp', 'tokens'],
    queryFn: async () => {
      const res = await api.mcp.tokens.$get();
      if (!res.ok) throw new Error('Failed to fetch MCP tokens');
      return res.json();
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (name?: string) => {
      // Step-up passkey: obtain a challenge, prove a live assertion, then mint.
      const optRes = await api.mcp.tokens.challenge.$post();
      if (!optRes.ok) {
        const err = (await optRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'パスキー認証の準備に失敗しました');
      }
      const options = (await optRes.json()) as PublicKeyCredentialRequestOptionsJSON;
      const response = await startAuthentication({ optionsJSON: options });

      const res = await api.mcp.tokens.$post({
        json: { name, response: response as unknown as Record<string, unknown> },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'トークン発行に失敗しました');
      }
      return res.json();
    },
    onSuccess: (created) => {
      const mcpUrl = `${window.location.origin}/api/mcp`;
      const command = `claude mcp add --transport http lifestyle ${mcpUrl} --header "Authorization: Bearer ${created.token}"`;
      setIssued({ token: created.token, command });
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['mcp', 'tokens'] });
    },
    onError: (err) => {
      // User-cancelled passkey prompt (NotAllowedError) is silent.
      if (err instanceof Error && err.name === 'NotAllowedError') return;
      toast.error(err instanceof Error ? err.message : 'トークン発行に失敗しました');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.mcp.tokens[':id'].$delete({ param: { id } });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? '失効に失敗しました');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp', 'tokens'] });
      setRevokeTargetId(null);
      toast.success('トークンを失効しました');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : '失効に失敗しました');
    },
  });

  const tokens = data?.tokens ?? [];

  const copyCommand = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.command);
      toast.success('コマンドをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">MCP連携</h2>
      <p className="mb-3 text-xs text-gray-500">
        アクセストークンを発行すると、Claude Code などのMCPクライアントから体重・食事・運動データを参照できます。
      </p>

      {!isSupported && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          このブラウザはパスキー(WebAuthn)に非対応のため、トークンを発行できません。パスキー対応ブラウザで開いてください。
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">読み込み中...</p>
      ) : tokens.length === 0 ? (
        <p className="mb-4 text-xs text-gray-500">発行済みのトークンはありません。</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {tokens.map((t) => {
            const revoked = !!t.revokedAt;
            return (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      revoked ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {t.name || '名称未設定'}
                    <span className="ml-2 font-mono text-[10px] text-gray-400">{t.prefix}…</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {revoked
                      ? `失効済み ${new Date(t.revokedAt as string).toLocaleDateString('ja-JP')}`
                      : t.lastUsedAt
                        ? `最終使用 ${new Date(t.lastUsedAt).toLocaleDateString('ja-JP')}`
                        : '未使用'}
                  </p>
                </div>
                {!revoked && (
                  <button
                    onClick={() => setRevokeTargetId(t.id)}
                    className="ml-2 shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    失効
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">新しいトークン</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: headless-linux"
            maxLength={100}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <button
            onClick={() => issueMutation.mutate(newName.trim() || undefined)}
            disabled={!isSupported || issueMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {issueMutation.isPending ? 'パスキー認証中...' : 'トークンを発行'}
          </button>
        </div>
      </div>

      {issued && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg card p-6">
            <h3 className="text-base font-semibold text-gray-900">トークンを発行しました</h3>
            <p className="mt-2 text-sm text-amber-700">
              このトークンは一度しか表示されません。今すぐコピーして安全な場所に保管してください。
            </p>
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-gray-600">接続コマンド (Claude Code)</p>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
                {issued.command}
              </pre>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={copyCommand}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                コマンドをコピー
              </button>
              <button
                onClick={() => setIssued(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm card p-6">
            <h3 className="text-base font-semibold text-gray-900">このトークンを失効しますか?</h3>
            <p className="mt-2 text-sm text-gray-500">
              失効すると、このトークンを使っているMCPクライアントは接続できなくなります。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRevokeTargetId(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => revokeTargetId && revokeMutation.mutate(revokeTargetId)}
                disabled={revokeMutation.isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {revokeMutation.isPending ? '失効中...' : '失効する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
