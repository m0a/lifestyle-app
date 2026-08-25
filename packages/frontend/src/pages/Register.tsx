import { Link } from 'react-router-dom';
import { useState } from 'react';
import { usePasskeySignup } from '../hooks/usePasskeySignup';
import { PasskeyIcon } from '../components/auth/PasskeyIcon';

/**
 * Passkey-only signup.
 *
 * The display name is the only thing typed: there is no email address and no
 * password. It is also handed to the authenticator, so it is what the OS passkey
 * manager lists this account under.
 */
export function Register() {
  const [displayName, setDisplayName] = useState('');
  const { signup, isPending, error, isSupported } = usePasskeySignup();

  const trimmed = displayName.trim();

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">アカウント登録</h1>
          <p className="mt-1 text-sm text-gray-500">パスキーでアカウントを作成します</p>
        </div>

        {isSupported ? (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (trimmed) signup(trimmed);
            }}
          >
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                autoFocus
                autoComplete="nickname"
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                パスキー管理画面にもこの名前で表示されます
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending || trimmed.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              <PasskeyIcon />
              {isPending ? '登録中...' : 'パスキーで登録'}
            </button>

            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <p className="text-center text-[10px] text-gray-400">
              メールアドレスやパスワードの登録は不要です
            </p>
          </form>
        ) : (
          <div className="card bg-amber-50 border-l-4 border-amber-400 p-3">
            <p className="text-sm text-amber-800">
              このブラウザはパスキーに対応していません。パスキーに対応したブラウザ（Chrome、Safari、Edge
              等の最新版）をお使いください。
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          すでにアカウントをお持ちですか？{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
