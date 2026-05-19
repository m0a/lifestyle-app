import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';

export function usePasskeyRegistration() {
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async (name?: string) => {
      const optRes = await api.auth.webauthn.register.options.$post();
      if (!optRes.ok) {
        throw new Error('パスキー登録の準備に失敗しました');
      }
      const options = (await optRes.json()) as PublicKeyCredentialCreationOptionsJSON;

      const response = await startRegistration({ optionsJSON: options });

      const verRes = await api.auth.webauthn.register.verify.$post({
        json: { response: response as unknown as Record<string, unknown>, name },
      });
      if (!verRes.ok) {
        const err = (await verRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'パスキー登録に失敗しました');
      }
      return verRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkey', 'credentials'] });
    },
  });

  return {
    registerAsync: registerMutation.mutateAsync,
    isPending: registerMutation.isPending,
    error: registerMutation.error,
    isSupported: browserSupportsWebAuthn(),
  };
}
