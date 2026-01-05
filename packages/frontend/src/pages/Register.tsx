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
    try {
      const res = await api.auth.register.$post({ json: data });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '登録に失敗しました' }));
        throw new Error((errorData as { message?: string }).message || '登録に失敗しました');
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

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">アカウント登録</h1>
          <p className="mt-2 text-gray-600">新しいアカウントを作成してください</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="goalWeight" className="block text-sm font-medium text-gray-700">
                目標体重（kg、任意）
              </label>
              <input
                {...register('goalWeight', {
                  setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                })}
                type="number"
                id="goalWeight"
                step="0.1"
                min="20"
                max="300"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.goalWeight && (
                <p className="mt-1 text-sm text-red-600">{errors.goalWeight.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="goalCalories" className="block text-sm font-medium text-gray-700">
                1日の目標カロリー（kcal、任意）
              </label>
              <input
                {...register('goalCalories', {
                  setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)),
                })}
                type="number"
                id="goalCalories"
                step="50"
                min="500"
                max="10000"
                placeholder="2000"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">未入力の場合は2000kcalが設定されます</p>
              {errors.goalCalories && (
                <p className="mt-1 text-sm text-red-600">{errors.goalCalories.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? '登録中...' : '登録する'}
          </button>

          <p className="text-center text-sm text-gray-600">
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
