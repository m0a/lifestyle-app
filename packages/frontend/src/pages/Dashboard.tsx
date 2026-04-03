import { useState } from 'react';
import { useDashboard, type Period } from '../hooks/useDashboard';
import { PeriodSelector } from '../components/dashboard/PeriodSelector';
import { WeightSummaryCard } from '../components/dashboard/WeightSummaryCard';
import { MealSummaryCard } from '../components/dashboard/MealSummaryCard';
import { ExerciseSummaryCard } from '../components/dashboard/ExerciseSummaryCard';

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const { summary, isLoading, refetch } = useDashboard({ period });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const hasAnyData = summary && (
    summary.weight.recordCount > 0 ||
    summary.meals.mealCount > 0 ||
    summary.exercises.sessionCount > 0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ダッシュボード</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            健康管理の状況を確認しましょう
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={() => refetch()}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="更新"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="card p-12 text-center">
          <div className="mx-auto h-12 w-12 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            記録を始めましょう
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            体重・食事・運動を記録して、健康管理を始めましょう
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="/weight" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              体重を記録
            </a>
            <a href="/meals" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              食事を記録
            </a>
            <a href="/exercises" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              運動を記録
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <WeightSummaryCard
              startWeight={summary?.weight.startWeight ?? null}
              endWeight={summary?.weight.endWeight ?? null}
              change={summary?.weight.change ?? null}
              recordCount={summary?.weight.recordCount ?? 0}
            />
            <MealSummaryCard
              totalCalories={summary?.meals.totalCalories ?? 0}
              mealCount={summary?.meals.mealCount ?? 0}
              averageCalories={summary?.meals.averageCalories ?? 0}
              byType={summary?.meals.byType ?? {}}
              totalProtein={summary?.meals.totalProtein ?? 0}
              totalFat={summary?.meals.totalFat ?? 0}
              totalCarbs={summary?.meals.totalCarbs ?? 0}
            />
            <ExerciseSummaryCard
              totalSets={summary?.exercises.totalSets ?? 0}
              totalReps={summary?.exercises.totalReps ?? 0}
              sessionCount={summary?.exercises.sessionCount ?? 0}
              byType={summary?.exercises.byType ?? {}}
            />
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">
              クイックアクション
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/weight', label: '体重を記録' },
                { href: '/meals', label: '食事を記録' },
                { href: '/exercises', label: '運動を記録' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Period Info */}
          {summary?.period && (
            <p className="text-center text-xs text-gray-400">
              {new Date(summary.period.startDate).toLocaleDateString('ja-JP')} 〜{' '}
              {new Date(summary.period.endDate).toLocaleDateString('ja-JP')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
