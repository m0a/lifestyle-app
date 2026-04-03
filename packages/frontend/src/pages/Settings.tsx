import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import { useAuthStore } from '../stores/authStore';

export function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Goal settings state
  const [goalWeight, setGoalWeight] = useState<string>('');
  const [goalCalories, setGoalCalories] = useState<string>('');
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await api.user.profile.$get();
      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: async () => {
      const res = await api.user.stats.$get();
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      return res.json();
    },
  });

  // Fetch AI usage
  const { data: aiUsage } = useQuery({
    queryKey: ['user', 'ai-usage'],
    queryFn: async () => {
      const res = await api.user['ai-usage'].$get();
      if (!res.ok) {
        throw new Error('Failed to fetch AI usage');
      }
      return res.json();
    },
  });

  // Initialize goal values from profile
  useEffect(() => {
    if (profile) {
      setGoalWeight(profile.goalWeight?.toString() ?? '');
      setGoalCalories(profile.goalCalories?.toString() ?? '');
    }
  }, [profile]);

  // Update goals mutation
  const goalsMutation = useMutation({
    mutationFn: async (goals: { goalWeight?: number | null; goalCalories?: number | null }) => {
      const res = await api.user.goals.$patch({ json: goals });
      if (!res.ok) {
        throw new Error('Failed to update goals');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 3000);
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.user.account.$delete();
      if (!res.ok) {
        throw new Error('Failed to delete account');
      }
      return res.json();
    },
    onSuccess: () => {
      logout();
      navigate('/');
    },
  });

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExportStatus('エクスポート中...');

      const res = await api.user.export.$get({ query: { format } });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `health-data.${format}`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('エクスポートが完了しました');
      setTimeout(() => setExportStatus(null), 3000);
    } catch {
      setExportStatus('エクスポートに失敗しました');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === '削除') {
      deleteMutation.mutate();
    }
  };

  const handleSaveGoals = () => {
    const goals: { goalWeight?: number | null; goalCalories?: number | null } = {};

    if (goalWeight.trim() === '') {
      goals.goalWeight = null;
    } else {
      const weight = parseFloat(goalWeight);
      if (!isNaN(weight) && weight >= 20 && weight <= 300) {
        goals.goalWeight = weight;
      }
    }

    if (goalCalories.trim() === '') {
      goals.goalCalories = null;
    } else {
      const calories = parseInt(goalCalories, 10);
      if (!isNaN(calories) && calories >= 500 && calories <= 10000) {
        goals.goalCalories = calories;
      }
    }

    goalsMutation.mutate(goals);
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">設定</h1>
        <p className="mt-0.5 text-sm text-gray-500">アカウント設定とデータ管理</p>
      </div>

      {/* Profile Section */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">プロフィール</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400">メールアドレス</p>
            <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">登録日</p>
            <p className="text-sm font-medium text-gray-900">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('ja-JP')
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">目標設定</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="goalWeight" className="block text-xs font-medium text-gray-600">
              目標体重 (kg)
            </label>
            <input
              type="number"
              id="goalWeight"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
              placeholder="例: 65"
              min="20"
              max="300"
              step="0.1"
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-48 transition-colors"
            />
            <p className="mt-1 text-[10px] text-gray-400">20〜300kgの範囲</p>
          </div>
          <div>
            <label htmlFor="goalCalories" className="block text-xs font-medium text-gray-600">
              1日の目標カロリー (kcal)
            </label>
            <input
              type="number"
              id="goalCalories"
              value={goalCalories}
              onChange={(e) => setGoalCalories(e.target.value)}
              placeholder="例: 2000"
              min="500"
              max="10000"
              step="50"
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-48 transition-colors"
            />
            <p className="mt-1 text-[10px] text-gray-400">500〜10000kcalの範囲</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGoals}
              disabled={goalsMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {goalsMutation.isPending ? '保存中...' : '保存'}
            </button>
            {goalsSaved && (
              <span className="text-xs text-emerald-600">保存しました</span>
            )}
            {goalsMutation.isError && (
              <span className="text-xs text-red-500">保存に失敗しました</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats & AI Usage - side by side on tablet+ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Stats Section */}
        {stats && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">記録統計</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 tabular-nums">{stats.weightRecords}</p>
                <p className="text-xs text-gray-400">体重</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.mealRecords}</p>
                <p className="text-xs text-gray-400">食事</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500 tabular-nums">{stats.exerciseRecords}</p>
                <p className="text-xs text-gray-400">運動</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.totalRecords}</p>
                <p className="text-xs text-gray-400">合計</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Usage Section */}
        {aiUsage && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">AI使用量</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-600 tabular-nums" data-testid="ai-monthly-tokens">
                  {aiUsage.monthlyTokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">今月のトークン</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums" data-testid="ai-total-tokens">
                  {aiUsage.totalTokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">累計トークン</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-400">
              トークンはAI機能（食事分析・チャット）で消費されます
            </p>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">データエクスポート</h2>
        <p className="mb-3 text-xs text-gray-500">
          すべての記録データをダウンロードできます。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('json')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            JSONでエクスポート
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            CSVでエクスポート
          </button>
        </div>
        {exportStatus && (
          <p className="mt-2 text-xs text-gray-500">{exportStatus}</p>
        )}
      </div>

      {/* Delete Account Section */}
      <div className="card border border-red-100 bg-red-50/50 p-5">
        <h2 className="mb-2 text-sm font-semibold text-red-900">アカウント削除</h2>
        <p className="mb-3 text-xs text-red-600">
          アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
        </p>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          アカウントを削除
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm card p-6">
            <h3 className="text-base font-semibold text-gray-900">
              本当に削除しますか？
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              すべてのデータ（体重{stats?.weightRecords || 0}件、
              食事{stats?.mealRecords || 0}件、運動{stats?.exerciseRecords || 0}件）が完全に削除されます。
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600">
                確認のため「削除」と入力してください
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="削除"
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation('');
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== '削除' || deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? '削除中...' : '削除する'}
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="mt-2 text-xs text-red-500">
                削除に失敗しました。もう一度お試しください。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
