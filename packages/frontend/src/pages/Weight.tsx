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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">体重記録</h1>
        <p className="mt-1 text-gray-600">日々の体重を記録して、推移を確認しましょう</p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">現在の体重</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">前回との差</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              weightChange === null
                ? 'text-gray-900'
                : weightChange > 0
                  ? 'text-red-600'
                  : weightChange < 0
                    ? 'text-green-600'
                    : 'text-gray-900'
            }`}
          >
            {weightChange !== null
              ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`
              : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">目標まで</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              goalProgress === null
                ? 'text-gray-900'
                : goalProgress > 0
                  ? 'text-orange-600'
                  : 'text-green-600'
            }`}
          >
            {goalProgress !== null
              ? goalProgress <= 0
                ? '達成！'
                : `${goalProgress.toFixed(1)} kg`
              : user?.goalWeight
                ? '-'
                : '未設定'}
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">体重を記録</h2>
        <WeightInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
        />
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <WeightChart weights={weights} />
      </div>

      {/* History List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">記録履歴</h2>
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
