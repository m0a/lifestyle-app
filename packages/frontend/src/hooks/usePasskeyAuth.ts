import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api } from '../lib/client';
import { useAuthStore } from '../stores/authStore';

export function usePasskeyAuth(redirectTo = '/') {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    setIsPending(true);
    setError(null);
    try {
      const optRes = await api.auth.webauthn.authenticate.options.$post();
      if (!optRes.ok) {
        throw new Error('パスキー認証の準備に失敗しました');
      }
      const options = (await optRes.json()) as PublicKeyCredentialRequestOptionsJSON;

      const response = await startAuthentication({ optionsJSON: options });

      const verRes = await api.auth.webauthn.authenticate.verify.$post({
        json: { response: response as unknown as Record<string, unknown> },
      });
      if (!verRes.ok) {
        const err = (await verRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'パスキー認証に失敗しました');
      }
      const data = (await verRes.json()) as { user: Parameters<typeof setUser>[0] };
      setUser(data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        // ユーザーキャンセル(NotAllowedError) はエラー表示しない
        if (err.name === 'NotAllowedError') {
          setError(null);
        } else {
          setError(err.message);
        }
      } else {
        setError('パスキー認証に失敗しました');
      }
    } finally {
      setIsPending(false);
    }
  };

  return {
    authenticate,
    isPending,
    error,
    isSupported: browserSupportsWebAuthn(),
  };
}
