import { useWeights } from '../hooks/useWeights';
import { WeightInput } from '../components/weight/WeightInput';
import { WeightChart } from '../components/weight/WeightChart';
import { WeightList } from '../components/weight/WeightList';
import { useAuthStore } from '../stores/authStore';

export function Weight() {
  const { user } = useAuthStore();
  const {
    weights,
    isLoading,
    error,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
  } = useWeights();

  // Calculate weight change
  const latestWeight = weights[0]?.weight ?? null;
  const previousWeight = weights[1]?.weight ?? null;
  const weightChange =
    latestWeight !== null && previousWeight !== null
      ? latestWeight - previousWeight
      : null;

  const goalProgress =
    user?.goalWeight && latestWeight !== null
      ? latestWeight - user.goalWeight
      : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 p-4">
        <p className="text-sm text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">体重記録</h1>

      {/* Stats Summary */}
      <div className="grid gap-3 grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-gray-400">現在</p>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
            {latestWeight !== null ? `${latestWeight.toFixed(1)}` : '-'}
          </p>
          <p className="text-xs text-gray-400">kg</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">前回比</p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${
              weightChange === null
                ? 'text-gray-900'
                : weightChange > 0
                  ? 'text-red-500'
                  : weightChange < 0
                    ? 'text-emerald-600'
                    : 'text-gray-900'
            }`}
          >
            {weightChange !== null
              ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}`
              : '-'}
          </p>
          <p className="text-xs text-gray-400">kg</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400">目標まで</p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${
              goalProgress === null
                ? 'text-gray-900'
                : goalProgress > 0
                  ? 'text-orange-500'
                  : 'text-emerald-600'
            }`}
          >
            {goalProgress !== null
              ? goalProgress <= 0
                ? '達成!'
                : `${goalProgress.toFixed(1)}`
              : user?.goalWeight
                ? '-'
                : '--'}
          </p>
          <p className="text-xs text-gray-400">{user?.goalWeight ? 'kg' : '未設定'}</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">体重を記録</h2>
        <WeightInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
        />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <WeightChart weights={weights} />
      </div>

      {/* History List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">記録履歴</h2>
        <WeightList
          weights={weights}
          onUpdate={update}
          onDelete={remove}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
