import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../../lib/client';
import { usePasskeyRegistration } from '../../hooks/usePasskeyRegistration';
import { useToast } from '../ui/Toast';

export function PasskeyManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const isSupported = browserSupportsWebAuthn();

  const { data, isLoading } = useQuery({
    queryKey: ['passkey', 'credentials'],
    queryFn: async () => {
      const res = await api.auth.webauthn.credentials.$get();
      if (!res.ok) throw new Error('Failed to fetch credentials');
      return res.json();
    },
    enabled: isSupported,
  });

  const { registerAsync, isPending: isRegistering } = usePasskeyRegistration();

  const deleteMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      const res = await api.auth.webauthn.credentials[':credentialId'].$delete({
        param: { credentialId },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? '削除に失敗しました');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkey', 'credentials'] });
      setDeleteTargetId(null);
      toast.success('パスキーを削除しました');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    },
  });

  if (!isSupported) {
    return (
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">パスキー管理</h2>
        <p className="text-xs text-gray-500">
          このブラウザはパスキー(WebAuthn)に対応していません。
        </p>
      </div>
    );
  }

  const credentials = data?.credentials ?? [];

  const handleAdd = async () => {
    try {
      await registerAsync(newName.trim() || undefined);
      setNewName('');
      toast.success('パスキーを登録しました');
    } catch (err) {
      // ユーザーキャンセル(NotAllowedError)は黙る
      if (err instanceof Error && err.name === 'NotAllowedError') return;
      const message = err instanceof Error ? err.message : 'パスキー登録に失敗しました';
      toast.error(message);
    }
  };

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">パスキー管理</h2>

      {isLoading ? (
        <p className="text-xs text-gray-400">読み込み中...</p>
      ) : credentials.length === 0 ? (
        <p className="mb-4 text-xs text-gray-500">
          パスキーを登録すると、次回からパスワード不要でログインできます。
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {credentials.map((cred) => (
            <li
              key={cred.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {cred.name || '名称未設定'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {cred.deviceType === 'multiDevice' ? '同期済み' : 'このデバイスのみ'}
                  {cred.lastUsedAt
                    ? ` ・ 最終使用 ${new Date(cred.lastUsedAt).toLocaleDateString('ja-JP')}`
                    : ' ・ 未使用'}
                </p>
              </div>
              <button
                onClick={() => setDeleteTargetId(cred.credentialId)}
                className="ml-2 shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          新しいパスキー
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: iPhone 15"
            maxLength={50}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={isRegistering}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRegistering ? '登録中...' : 'パスキーを追加'}
          </button>
        </div>
      </div>

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm card p-6">
            <h3 className="text-base font-semibold text-gray-900">
              このパスキーを削除しますか?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              削除すると、このデバイスからパスキーでログインできなくなります。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
