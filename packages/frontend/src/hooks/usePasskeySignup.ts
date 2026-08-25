import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { api } from '../lib/client';
import { useAuthStore } from '../stores/authStore';

/**
 * Create an account with a passkey and nothing else.
 *
 * Mirrors usePasskeyAuth (imperative, own pending/error state) rather than
 * usePasskeyRegistration (react-query), because like login this ends in a
 * navigation rather than a cache invalidation.
 */
export function usePasskeySignup(redirectTo = '/') {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = async (displayName: string) => {
    setIsPending(true);
    setError(null);
    try {
      const optRes = await api.auth.webauthn.signup.options.$post({ json: { displayName } });
      if (!optRes.ok) {
        const err = (await optRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'パスキー登録の準備に失敗しました');
      }
      const options = (await optRes.json()) as PublicKeyCredentialCreationOptionsJSON;

      const response = await startRegistration({ optionsJSON: options });

      const verRes = await api.auth.webauthn.signup.verify.$post({
        json: { response: response as unknown as Record<string, unknown> },
      });
      if (!verRes.ok) {
        const err = (await verRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'アカウント登録に失敗しました');
      }
      const data = (await verRes.json()) as { user: Parameters<typeof setUser>[0] };
      setUser(data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        // ユーザーキャンセル(NotAllowedError) はエラー表示しない
        setError(err.name === 'NotAllowedError' ? null : err.message);
      } else {
        setError('アカウント登録に失敗しました');
      }
    } finally {
      setIsPending(false);
    }
  };

  return {
    signup,
    isPending,
    error,
    isSupported: browserSupportsWebAuthn(),
  };
}
