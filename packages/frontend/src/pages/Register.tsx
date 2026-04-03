import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { registerSchema, type RegisterInput } from '@lifestyle-app/shared';
import { api } from '../lib/client';
import { useAuthStore } from '../stores/authStore';

export function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    console.log('[Register] Submitting data:', JSON.stringify(data, null, 2));
    try {
      const res = await api.auth.register.$post({ json: data });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '登録に失敗しました' }));
        console.error('[Register] Error response:', errorData);
        const errorObj = errorData as { message?: string; error?: { issues?: unknown[] } };
        const errorMessage = errorObj.error?.issues
          ? JSON.stringify(errorObj.error.issues, null, 2)
          : errorObj.message || '登録に失敗しました';
        throw new Error(errorMessage);
      }
      const response = await res.json();
      setUser(response.user);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登録に失敗しました');
      }
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">アカウント登録</h1>
          <p className="mt-1 text-sm text-gray-500">新しいアカウントを作成してください</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="card bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className={inputClassName}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="new-password"
                className={inputClassName}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="goalWeight" className="block text-sm font-medium text-gray-700">
                目標体重 <span className="text-xs text-gray-400">(kg, 任意)</span>
              </label>
              <input
                {...register('goalWeight')}
                type="number"
                id="goalWeight"
                step="0.1"
                min="20"
                max="300"
                className={inputClassName}
              />
              {errors.goalWeight && (
                <p className="mt-1 text-xs text-red-500">{errors.goalWeight.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="goalCalories" className="block text-sm font-medium text-gray-700">
                1日の目標カロリー <span className="text-xs text-gray-400">(kcal, 任意)</span>
              </label>
              <input
                {...register('goalCalories')}
                type="number"
                id="goalCalories"
                step="50"
                min="500"
                max="10000"
                placeholder="2000"
                className={inputClassName}
              />
              <p className="mt-1 text-[10px] text-gray-400">未入力の場合は2000kcalが設定されます</p>
              {errors.goalCalories && (
                <p className="mt-1 text-xs text-red-500">{errors.goalCalories.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録する'}
          </button>

          <p className="text-center text-sm text-gray-500">
            すでにアカウントをお持ちですか？{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
