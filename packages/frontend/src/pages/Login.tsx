import { Link, useLocation } from 'react-router-dom';
import { usePasskeyAuth } from '../hooks/usePasskeyAuth';
import { PasskeyIcon } from '../components/auth/PasskeyIcon';

/**
 * Passkey-only login.
 *
 * No identifier is typed: the credential is discoverable (residentKey required),
 * so the authenticator itself decides which account is being signed into.
 */
export function Login() {
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';
  const successMessage = (location.state as { message?: string })?.message;

  const { authenticate, isPending, error, isSupported } = usePasskeyAuth(from);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          <p className="mt-1 text-sm text-gray-500">パスキーでログインしてください</p>
        </div>

        {successMessage && (
          <div className="card bg-emerald-50 p-3">
            <p className="text-sm text-emerald-700">{successMessage}</p>
          </div>
        )}

        {isSupported ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={authenticate}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              <PasskeyIcon />
              {isPending ? '認証中...' : 'パスキーでログイン'}
            </button>
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <p className="text-center text-[10px] text-gray-400">
              メールアドレスやパスワードの入力は不要です
            </p>
          </div>
        ) : (
          <div className="card bg-amber-50 border-l-4 border-amber-400 p-3">
            <p className="text-sm text-amber-800">
              このブラウザはパスキーに対応していません。パスキーに対応したブラウザ（Chrome、Safari、Edge
              等の最新版）をお使いください。
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          アカウントをお持ちでないですか？{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            登録する
          </Link>
        </p>
      </div>
    </div>
  );
}
